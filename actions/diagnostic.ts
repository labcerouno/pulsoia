'use server'

import { createServerClient } from '@/lib/supabase/server'
import { computeScores } from '@/lib/scoring'
import { enrichResponse } from '@/lib/ai/enrichment'
import type { ProfileLabel } from '@/lib/supabase/types'

type DiagnosticStep = 'q1' | 'q2' | 'q3' | 'q4' | 'q4f' | 'q5' | 'q6' | 'q6f'

const VALUE_KEYWORDS = ['ahorre', 'ahorr', 'mejore', 'mejor', 'logre', 'logr', 'reduje', 'reduj', 'automatice', 'automat']

function needsFollowupQ4(text: string | null): boolean {
  if (!text) return false
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
  return text.trim().length > 100 || VALUE_KEYWORDS.some((kw) => normalized.includes(kw))
}

function needsFollowupQ6(text: string | null): boolean {
  if (!text) return false
  return text.trim().length > 40
}

function getCurrentStep(response: {
  q1_usage: boolean | null
  q2_integration: string | null
  q3_use_cases: string[] | null
  q3_use_cases_other: string | null
  q4_success_case_raw: string | null
  q4_followup_raw: string | null
  q5_barrier: string | null
  q6_opportunity_raw: string | null
  q6_followup_raw: string | null
}): DiagnosticStep {
  if (response.q1_usage === null) return 'q1'
  if (!response.q2_integration) return 'q2'
  if (!response.q3_use_cases && !response.q3_use_cases_other) return 'q3'
  if (!response.q4_success_case_raw) return 'q4'
  if (needsFollowupQ4(response.q4_success_case_raw) && !response.q4_followup_raw) return 'q4f'
  if (!response.q5_barrier) return 'q5'
  if (!response.q6_opportunity_raw) return 'q6'
  if (needsFollowupQ6(response.q6_opportunity_raw) && !response.q6_followup_raw) return 'q6f'
  return 'q6'
}

export async function startSession(participantId: string): Promise<{ sessionId: string; error?: string }> {
  try {
    const supabase = createServerClient()

    // Reuse active session to keep a single response record while token is still unused.
    const { data: openSession, error: openSessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('participant_id', participantId)
      .eq('session_status', 'started')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (openSessionError) {
      console.error('[startSession] open session lookup error:', openSessionError)
      return { sessionId: '', error: 'Error al preparar sesión' }
    }

    if (openSession?.id) {
      await supabase
        .from('sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', openSession.id)

      const { data: existingResponse } = await supabase
        .from('responses')
        .select('id')
        .eq('session_id', openSession.id)
        .eq('participant_id', participantId)
        .limit(1)

      if (!existingResponse || existingResponse.length === 0) {
        await supabase.from('responses').insert({
          participant_id: participantId,
          session_id: openSession.id,
        })
      }

      return { sessionId: openSession.id }
    }

    // Mark participant as started
    await supabase
      .from('participants')
      .update({ started_at: new Date().toISOString() })
      .eq('id', participantId)
      .is('started_at', null)

    // Create session
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        participant_id: participantId,
        session_status: 'started',
      })
      .select('id')
      .single()

    if (error || !session) {
      console.error('[startSession] session insert error:', error)
      return { sessionId: '', error: 'Error al crear sesión' }
    }

    // Create empty response record (best-effort; saveAnswer is self-healing if this fails)
    const { error: respError } = await supabase.from('responses').insert({
      participant_id: participantId,
      session_id: session.id,
    })
    if (respError) {
      console.error('[startSession] response insert error (non-fatal):', respError)
    }

    return { sessionId: session.id }
  } catch (err) {
    console.error('[startSession] unexpected error:', err)
    return { sessionId: '', error: 'Error inesperado' }
  }
}

export async function saveAnswer(
  sessionId: string,
  participantId: string,
  field: string,
  value: unknown
): Promise<{ error?: string }> {
  try {
    const supabase = createServerClient()

    // Update last_activity_at on session
    await supabase
      .from('sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', sessionId)

    // Try to update the existing response row; request the id back to detect 0-row updates
    const { data: updated, error: updateError } = await supabase
      .from('responses')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('participant_id', participantId)
      .select('id')

    if (updateError) {
      console.error('[saveAnswer] update error:', updateError)
      return { error: 'Error al guardar respuesta' }
    }

    // If no rows were updated the response row doesn't exist yet — create it now
    if (!updated || updated.length === 0) {
      console.warn('[saveAnswer] no row found for session', sessionId, '— inserting new response row')
      const { error: insertError } = await supabase.from('responses').insert({
        participant_id: participantId,
        session_id: sessionId,
        [field]: value,
      })
      if (insertError) {
        console.error('[saveAnswer] insert error:', insertError)
        return { error: 'Error al guardar respuesta' }
      }
    }

    return {}
  } catch (err) {
    console.error('[saveAnswer] unexpected error:', err)
    return { error: 'Error inesperado' }
  }
}

export async function getDiagnosticSnapshot(
  sessionId: string,
  participantId: string
): Promise<{
  found: boolean
  step?: DiagnosticStep
  data?: {
    q1_usage: boolean | null
    q1_tools_used: string | null
    q2_integration: string | null
    q3_use_cases: string[] | null
    q3_use_cases_other: string | null
    q4_success_case_raw: string | null
    q4_followup_raw: string | null
    q5_barrier: string | null
    q5_barrier_other: string | null
    q6_opportunity_raw: string | null
    q6_followup_raw: string | null
  }
}> {
  try {
    const supabase = createServerClient()

    const { data: response, error } = await supabase
      .from('responses')
      .select(
        'q1_usage, q1_tools_used, q2_integration, q3_use_cases, q3_use_cases_other, q4_success_case_raw, q4_followup_raw, q5_barrier, q5_barrier_other, q6_opportunity_raw, q6_followup_raw'
      )
      .eq('session_id', sessionId)
      .eq('participant_id', participantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !response) {
      return { found: false }
    }

    return {
      found: true,
      data: response,
      step: getCurrentStep(response),
    }
  } catch (err) {
    console.error('[getDiagnosticSnapshot] error:', err)
    return { found: false }
  }
}

export async function completeSession(
  sessionId: string,
  participantId: string,
  token: string
): Promise<{ error?: string }> {
  try {
    const supabase = createServerClient()

    // Fetch current response — use maybeSingle to avoid crash on 0 rows
    const { data: response, error: fetchError } = await supabase
      .from('responses')
      .select('*')
      .eq('session_id', sessionId)
      .eq('participant_id', participantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error('[completeSession] fetch error:', fetchError)
      return { error: 'Error al leer respuesta' }
    }

    if (!response) {
      console.error('[completeSession] no response row found for session', sessionId)
      return { error: 'No se encontró la respuesta' }
    }

    // Compute deterministic scores
    const scores = computeScores({
      q1_usage: response.q1_usage,
      q1_tools_used: response.q1_tools_used,
      q2_integration: response.q2_integration,
      q4_success_case_raw: response.q4_success_case_raw,
      q4_followup_raw: response.q4_followup_raw,
      q6_opportunity_raw: response.q6_opportunity_raw,
      q6_followup_raw: response.q6_followup_raw,
    })

    // AI enrichment (with fallback)
    const enrichment = await enrichResponse({
      q1_usage: response.q1_usage,
      q1_tools_used: response.q1_tools_used,
      q2_integration: response.q2_integration,
      q3_use_cases: response.q3_use_cases,
      q3_use_cases_other: response.q3_use_cases_other,
      q4_success_case_raw: response.q4_success_case_raw,
      q4_followup_raw: response.q4_followup_raw,
      q5_barrier: response.q5_barrier,
      q5_barrier_other: response.q5_barrier_other,
      q6_opportunity_raw: response.q6_opportunity_raw,
      q6_followup_raw: response.q6_followup_raw,
      profile_label: scores.profile_label,
      score_total: scores.score_total,
    })

    const now = new Date().toISOString()

    // Update response with scores + enrichment
    await supabase
      .from('responses')
      .update({
        ...scores,
        ai_summary: enrichment.ai_summary,
        ai_tags: [`provider:${enrichment.provider_used}`],
        barrier_tags: enrichment.barrier_tags,
        opportunity_tags: enrichment.opportunity_tags,
        has_success_case: enrichment.has_success_case,
        success_case_summary: enrichment.success_case_summary,
        strength_summary: enrichment.strength_summary,
        next_step_recommendation: enrichment.next_step_recommendation,
        updated_at: now,
      })
      .eq('session_id', sessionId)

    // Mark session as completed
    await supabase
      .from('sessions')
      .update({
        session_status: 'completed',
        completed_at: now,
        last_activity_at: now,
      })
      .eq('id', sessionId)

    // Mark token as used and set completed_at on participant
    await supabase
      .from('participants')
      .update({
        token_status: 'used',
        completed_at: now,
      })
      .eq('access_token', token)

    return {}
  } catch (err) {
    console.error('[completeSession] unexpected error:', err)
    return { error: 'Error al completar sesión' }
  }
}

export async function validateToken(token: string): Promise<{
  valid: boolean
  status?: string
  participant?: { id: string; full_name: string; area: string | null }
}> {
  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('participants')
      .select('id, full_name, area, token_status')
      .eq('access_token', token)
      .single()

    if (error || !data) {
      return { valid: false, status: 'invalid' }
    }

    if (data.token_status === 'used') {
      return { valid: false, status: 'used' }
    }

    if (data.token_status === 'expired') {
      return { valid: false, status: 'expired' }
    }

    return {
      valid: true,
      status: 'unused',
      participant: { id: data.id, full_name: data.full_name, area: data.area },
    }
  } catch (err) {
    console.error('[validateToken] error:', err)
    return { valid: false, status: 'invalid' }
  }
}

export async function getResultByToken(token: string): Promise<{
  found: boolean
  participant?: { full_name: string; area: string | null; role: string | null }
  response?: {
    score_total: number
    profile_label: ProfileLabel
    score_usage: number
    score_integration: number
    score_value_signal: number
    score_opportunity_clarity: number
    strength_summary: string | null
    next_step_recommendation: string | null
    ai_summary: string | null
    ai_tags: string[] | null
    has_success_case: boolean
    success_case_summary: string | null
    q1_tools_used: string | null
    q3_use_cases: string[] | null
    q3_use_cases_other: string | null
    q5_barrier: string | null
    q5_barrier_other: string | null
    q6_opportunity_raw: string | null
  }
}> {
  try {
    const supabase = createServerClient()

    const { data: participant, error: pErr } = await supabase
      .from('participants')
      .select('id, full_name, area, role, token_status')
      .eq('access_token', token)
      .single()

    if (pErr || !participant || participant.token_status !== 'used') {
      return { found: false }
    }

    const { data: response, error: rErr } = await supabase
      .from('responses')
      .select(
        'score_total, profile_label, score_usage, score_integration, score_value_signal, score_opportunity_clarity, strength_summary, next_step_recommendation, ai_summary, ai_tags, has_success_case, success_case_summary, q1_tools_used, q3_use_cases, q3_use_cases_other, q5_barrier, q5_barrier_other, q6_opportunity_raw'
      )
      .eq('participant_id', participant.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (rErr || !response) {
      return { found: false }
    }

    return {
      found: true,
      participant: { full_name: participant.full_name, area: participant.area, role: participant.role },
      response: response as {
        score_total: number
        profile_label: ProfileLabel
        score_usage: number
        score_integration: number
        score_value_signal: number
        score_opportunity_clarity: number
        strength_summary: string | null
        next_step_recommendation: string | null
        ai_summary: string | null
        ai_tags: string[] | null
        has_success_case: boolean
        success_case_summary: string | null
        q1_tools_used: string | null
        q3_use_cases: string[] | null
        q3_use_cases_other: string | null
        q5_barrier: string | null
        q5_barrier_other: string | null
        q6_opportunity_raw: string | null
      },
    }
  } catch (err) {
    console.error('[getResultByToken] error:', err)
    return { found: false }
  }
}
