'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { parseCsvParticipants, buildParticipantsCsv, buildResultsCsv } from '@/lib/csv'
import { generateToken } from '@/lib/tokens'

// Helper to get current user ID from cookies
async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    return cookieStore.get('admin_user_id')?.value || null
  } catch {
    return null
  }
}

export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  participants: Array<{
    full_name: string
    corporate_email: string
    access_token: string
    link: string
  }>
}

export async function importParticipants(formData: FormData): Promise<ImportResult> {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, imported: 0, skipped: 0, errors: ['Usuario no autenticado'], participants: [] }

  const file = formData.get('file') as File | null

  if (!file) {
    return { success: false, imported: 0, skipped: 0, errors: ['No se proporcionó archivo'], participants: [] }
  }

  const text = await file.text()
  let rows

  try {
    rows = parseCsvParticipants(text)
  } catch (err) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [(err as Error).message],
      participants: [],
    }
  }

  const supabase = createServerClient()
  const imported: ImportResult['participants'] = []
  const errors: string[] = []
  let skipped = 0

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  for (const row of rows) {
    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from('participants')
        .select('id, access_token')
        .eq('corporate_email', row.corporate_email)
        .single()

      if (existing) {
        skipped++
        // Still include them in the result with their existing token
        imported.push({
          full_name: row.full_name,
          corporate_email: row.corporate_email,
          access_token: existing.access_token,
          link: `${appUrl}/bcr?t=${existing.access_token}`,
        })
        continue
      }

      const token = generateToken()

      const { error } = await supabase.from('participants').insert({
        full_name: row.full_name,
        corporate_email: row.corporate_email,
        area: row.area || null,
        management_unit: row.management_unit || null,
        role: row.role || null,
        access_token: token,
        token_status: 'unused',
        invited_at: new Date().toISOString(),
        imported_by_user_id: userId,
      })

      if (error) {
        errors.push(`${row.corporate_email}: ${error.message}`)
        continue
      }

      imported.push({
        full_name: row.full_name,
        corporate_email: row.corporate_email,
        access_token: token,
        link: `${appUrl}/bcr?t=${token}`,
      })
    } catch (err) {
      errors.push(`${row.corporate_email}: ${(err as Error).message}`)
    }
  }

  return {
    success: true,
    imported: imported.length - skipped,
    skipped,
    errors,
    participants: imported,
  }
}

export interface DashboardStats {
  total_invited: number
  total_started: number
  total_completed: number
  completion_rate: number
  avg_score: number | null
  profile_distribution: Record<string, number>
}

export async function getStats(): Promise<DashboardStats> {
  const userId = await getCurrentUserId()
  if (!userId) return { total_invited: 0, total_started: 0, total_completed: 0, completion_rate: 0, avg_score: null, profile_distribution: {} }

  const supabase = createServerClient()

  const { data: participants } = await supabase
    .from('participants')
    .select('token_status, started_at, completed_at')
    .eq('imported_by_user_id', userId)

  const total_invited = participants?.length ?? 0
  const total_started = participants?.filter(p => p.started_at !== null).length ?? 0
  const total_completed = participants?.filter(p => p.completed_at !== null).length ?? 0
  const completion_rate = total_invited > 0 ? Math.round((total_completed / total_invited) * 100) : 0

  const { data: responses } = await supabase
    .from('responses')
    .select('score_total, profile_label')
    .not('score_total', 'is', null)

  const scores = responses?.map(r => r.score_total).filter((s): s is number => s !== null) ?? []
  const avg_score = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null

  const profile_distribution: Record<string, number> = {}
  for (const r of responses ?? []) {
    if (r.profile_label) {
      profile_distribution[r.profile_label] = (profile_distribution[r.profile_label] ?? 0) + 1
    }
  }

  return {
    total_invited,
    total_started,
    total_completed,
    completion_rate,
    avg_score,
    profile_distribution,
  }
}

export interface ResultRow {
  id: string
  full_name: string
  corporate_email: string
  area: string | null
  management_unit: string | null
  role: string | null
  completed_at: string | null
  score_total: number | null
  profile_label: string | null
  score_usage: number | null
  score_integration: number | null
  score_value_signal: number | null
  score_opportunity_clarity: number | null
  q5_barrier: string | null
  has_success_case: boolean
  next_step_recommendation: string | null
  strength_summary: string | null
  ai_summary: string | null
}

export async function getResults(): Promise<ResultRow[]> {
  const userId = await getCurrentUserId()
  if (!userId) return []

  const supabase = createServerClient()

  const { data: participants } = await supabase
    .from('participants')
    .select('id, full_name, corporate_email, area, management_unit, role, completed_at')
    .eq('imported_by_user_id', userId)
    .eq('token_status', 'used')
    .order('completed_at', { ascending: false })

  if (!participants || participants.length === 0) return []

  const { data: responses } = await supabase
    .from('responses')
    .select(
      'participant_id, score_total, profile_label, score_usage, score_integration, score_value_signal, score_opportunity_clarity, q5_barrier, has_success_case, next_step_recommendation, strength_summary, ai_summary'
    )
    .in('participant_id', participants.map(p => p.id))
    .not('score_total', 'is', null)

  const responseMap = new Map(responses?.map(r => [r.participant_id, r]) ?? [])

  return participants.map(p => {
    const r = responseMap.get(p.id)
    return {
      id: p.id,
      full_name: p.full_name,
      corporate_email: p.corporate_email,
      area: p.area,
      management_unit: p.management_unit,
      role: p.role,
      completed_at: p.completed_at,
      score_total: r?.score_total ?? null,
      profile_label: r?.profile_label ?? null,
      score_usage: r?.score_usage ?? null,
      score_integration: r?.score_integration ?? null,
      score_value_signal: r?.score_value_signal ?? null,
      score_opportunity_clarity: r?.score_opportunity_clarity ?? null,
      q5_barrier: r?.q5_barrier ?? null,
      has_success_case: r?.has_success_case ?? false,
      next_step_recommendation: r?.next_step_recommendation ?? null,
      strength_summary: r?.strength_summary ?? null,
      ai_summary: r?.ai_summary ?? null,
    }
  })
}

export async function exportResultsCsv(): Promise<string> {
  const results = await getResults()
  return buildResultsCsv(results)
}

export interface ParticipantAdminRow {
  id: string
  full_name: string
  corporate_email: string
  area: string | null
  management_unit: string | null
  role: string | null
  access_token: string
  completed_at: string | null
  token_status: 'unused' | 'used' | 'expired'
  status_label: string
  link: string
}

export async function getParticipantsAdmin(): Promise<ParticipantAdminRow[]> {
  const userId = await getCurrentUserId()
  if (!userId) return []

  const supabase = createServerClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const { data: participants, error } = await supabase
    .from('participants')
    .select('id, full_name, corporate_email, area, management_unit, role, access_token, completed_at, token_status')
    .eq('imported_by_user_id', userId)
    .order('created_at', { ascending: false })

  if (error || !participants) return []

  return participants.map((p) => {
    const done = p.token_status === 'used' && !!p.completed_at
    return {
      id: p.id,
      full_name: p.full_name,
      corporate_email: p.corporate_email,
      area: p.area,
      management_unit: p.management_unit,
      role: p.role,
      access_token: p.access_token,
      completed_at: p.completed_at,
      token_status: p.token_status,
      status_label: done ? 'Concluida / PDF listo' : 'Pendiente',
      link: `${appUrl}/bcr?t=${p.access_token}`,
    }
  })
}

export async function exportParticipantsCsv(): Promise<string> {
  const rows = await getParticipantsAdmin()
  return buildParticipantsCsv(
    rows.map((r) => ({
      full_name: r.full_name,
      corporate_email: r.corporate_email,
      area: r.area,
      management_unit: r.management_unit,
      role: r.role,
      link: r.link,
      status: r.status_label,
    }))
  )
}

export async function deleteParticipant(id: string): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: 'ID inválido' }

  const supabase = createServerClient()

  const { error: responsesErr } = await supabase
    .from('responses')
    .delete()
    .eq('participant_id', id)

  if (responsesErr) return { success: false, error: responsesErr.message }

  const { error: sessionsErr } = await supabase
    .from('sessions')
    .delete()
    .eq('participant_id', id)

  if (sessionsErr) return { success: false, error: sessionsErr.message }

  const { error: participantErr } = await supabase
    .from('participants')
    .delete()
    .eq('id', id)

  if (participantErr) return { success: false, error: participantErr.message }

  return { success: true }
}
