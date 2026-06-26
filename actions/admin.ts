'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { parseCsvParticipants, buildParticipantsCsv, buildResultsCsv } from '@/lib/csv'
import type { ResultDetailFields } from '@/lib/results-columns'
import { generateToken } from '@/lib/tokens'
import { hasGlobalCompanyAccess } from '@/lib/admin-access'

interface AdminContext {
  userId: string | null
  canViewAllCompanies: boolean
}

export interface AdminEventOption {
  id: string
  name: string
  slug: string
  status: 'draft' | 'active' | 'closed'
}

export interface AdminEvent extends AdminEventOption {
  description: string | null
  starts_at: string | null
  created_at: string
  updated_at: string
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function normalizeCompanyFilter(company?: string | null): string | null {
  const value = (company || '').trim()
  return value.length > 0 ? value : null
}

function normalizeEventFilter(eventId?: string | null): string | null {
  const value = (eventId || '').trim()
  return value.length > 0 ? value : null
}

async function getCurrentAdminContext(): Promise<AdminContext> {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('admin_user_id')?.value || null
    if (!userId) return { userId: null, canViewAllCompanies: false }

    const supabase = createServerClient()
    const { data: user } = await supabase.from('admin_users').select('email').eq('id', userId).single()

    return {
      userId,
      canViewAllCompanies: hasGlobalCompanyAccess(user?.email),
    }
  } catch {
    return { userId: null, canViewAllCompanies: false }
  }
}

async function getCreatedEventIdsForUser(userId: string): Promise<string[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase.from('events').select('id').eq('created_by_user_id', userId)

  if (error || !data) return []
  return data.map((row) => row.id)
}

function applyParticipantAccessScope<T extends { or: (filters: string) => unknown; eq: (column: string, value: string) => unknown }>(
  query: T,
  userId: string,
  createdEventIds: string[]
): T {
  if (createdEventIds.length === 0) {
    query.eq('imported_by_user_id', userId)
    return query
  }

  query.or(`imported_by_user_id.eq.${userId},event_id.in.(${createdEventIds.join(',')})`)
  return query
}

export async function getEventOptions(): Promise<AdminEventOption[]> {
  const admin = await getCurrentAdminContext()
  if (!admin.userId) return []

  const supabase = createServerClient()

  if (admin.canViewAllCompanies) {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, slug, status')
      .order('starts_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data
  }

  const createdEventIds = await getCreatedEventIdsForUser(admin.userId)
  const { data: importedParticipantRows, error: importedParticipantError } = await supabase
    .from('participants')
    .select('event_id')
    .eq('imported_by_user_id', admin.userId)

  if (importedParticipantError) return []

  const importedEventIds = (importedParticipantRows || [])
    .map((row) => row.event_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)

  const allEventIds = Array.from(new Set([...createdEventIds, ...importedEventIds]))
  if (allEventIds.length === 0) return []

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, name, slug, status')
    .in('id', allEventIds)
    .order('starts_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (eventsError || !events) return []
  return events
}

export async function getAdminEvents(): Promise<AdminEvent[]> {
  const admin = await getCurrentAdminContext()
  if (!admin.userId) return []

  const supabase = createServerClient()

  if (admin.canViewAllCompanies) {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, slug, status, description, starts_at, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data
  }

  const options = await getEventOptions()
  if (options.length === 0) return []

  const { data, error } = await supabase
    .from('events')
    .select('id, name, slug, status, description, starts_at, created_at, updated_at')
    .in('id', options.map((event) => event.id))
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data
}

export async function createEvent(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const admin = await getCurrentAdminContext()
  if (!admin.userId) return { success: false, error: 'Usuario no autenticado' }

  const name = String(formData.get('name') || '').trim()
  const rawSlug = String(formData.get('slug') || '').trim()
  const description = String(formData.get('description') || '').trim()
  const startsAtRaw = String(formData.get('starts_at') || '').trim()
  const statusRaw = String(formData.get('status') || 'draft').trim().toLowerCase()
  const status = statusRaw === 'active' || statusRaw === 'closed' ? statusRaw : 'draft'

  if (!name) {
    return { success: false, error: 'El nombre del evento es obligatorio' }
  }

  const slug = slugify(rawSlug || name)
  if (!slug) {
    return { success: false, error: 'Slug inválido' }
  }

  let startsAt: string | null = null
  if (startsAtRaw) {
    const parsedDate = new Date(startsAtRaw)
    if (Number.isNaN(parsedDate.getTime())) {
      return { success: false, error: 'Fecha de inicio inválida' }
    }
    startsAt = parsedDate.toISOString()
  }

  const supabase = createServerClient()
  const { error } = await supabase.from('events').insert({
    name,
    slug,
    description: description || null,
    starts_at: startsAt,
    status,
    created_by_user_id: admin.userId,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updateEventStatus(eventId: string, status: 'draft' | 'active' | 'closed'): Promise<{ success: boolean; error?: string }> {
  const admin = await getCurrentAdminContext()
  if (!admin.userId) return { success: false, error: 'Usuario no autenticado' }

  const normalizedEventId = eventId.trim()
  if (!normalizedEventId) return { success: false, error: 'Evento inválido' }

  const supabase = createServerClient()

  if (!admin.canViewAllCompanies) {
    const { data: allowed, error: allowedError } = await supabase
      .from('events')
      .select('id')
      .eq('id', normalizedEventId)
      .eq('created_by_user_id', admin.userId)
      .maybeSingle()

    if (allowedError || !allowed) {
      return { success: false, error: 'No autorizado para modificar este evento' }
    }
  }

  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', normalizedEventId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getCompanyOptions(eventId?: string): Promise<string[]> {
  const admin = await getCurrentAdminContext()
  if (!admin.userId) return []

  const supabase = createServerClient()
  const eventFilter = normalizeEventFilter(eventId)

  let query = supabase.from('participants').select('company')

  if (!admin.canViewAllCompanies) {
    const createdEventIds = await getCreatedEventIdsForUser(admin.userId)
    query = applyParticipantAccessScope(query, admin.userId, createdEventIds)
  }

  if (eventFilter) {
    query = query.eq('event_id', eventFilter)
  }

  const { data, error } = await query
  if (error || !data) return []

  return Array.from(new Set(data.map((row) => row.company).filter((value): value is string => !!value && value.trim().length > 0))).sort(
    (a, b) => a.localeCompare(b, 'es')
  )
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
  const admin = await getCurrentAdminContext()
  if (!admin.userId) {
    return { success: false, imported: 0, skipped: 0, errors: ['Usuario no autenticado'], participants: [] }
  }

  const file = formData.get('file') as File | null
  const eventId = String(formData.get('event_id') || '').trim()
  const defaultCompany = String(formData.get('default_company') || '').trim()

  if (!file) {
    return { success: false, imported: 0, skipped: 0, errors: ['No se proporcionó archivo'], participants: [] }
  }

  if (!eventId) {
    return { success: false, imported: 0, skipped: 0, errors: ['Debes seleccionar un evento'], participants: [] }
  }

  const eventOptions = await getEventOptions()
  if (!eventOptions.some((event) => event.id === eventId)) {
    return { success: false, imported: 0, skipped: 0, errors: ['No autorizado para importar en ese evento'], participants: [] }
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  for (const row of rows) {
    try {
      const token = generateToken()

      const { error } = await supabase.from('participants').insert({
        full_name: row.full_name,
        corporate_email: row.corporate_email,
        company: row.company || defaultCompany || null,
        area: row.area || null,
        management_unit: row.management_unit || null,
        role: row.role || null,
        event_id: eventId,
        source: 'csv',
        access_token: token,
        token_status: 'unused',
        invited_at: new Date().toISOString(),
        imported_by_user_id: admin.userId,
      })

      if (error) {
        errors.push(`${row.corporate_email}: ${error.message}`)
        continue
      }

      imported.push({
        full_name: row.full_name,
        corporate_email: row.corporate_email,
        access_token: token,
        link: `${appUrl}/pulso?t=${token}`,
      })
    } catch (err) {
      errors.push(`${row.corporate_email}: ${(err as Error).message}`)
    }
  }

  return {
    success: true,
    imported: imported.length,
    skipped: 0,
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

export async function getStats(eventId?: string, company?: string): Promise<DashboardStats> {
  const admin = await getCurrentAdminContext()
  if (!admin.userId) {
    return { total_invited: 0, total_started: 0, total_completed: 0, completion_rate: 0, avg_score: null, profile_distribution: {} }
  }

  const supabase = createServerClient()
  const eventFilter = normalizeEventFilter(eventId)
  const companyFilter = normalizeCompanyFilter(company)

  let participantsQuery = supabase.from('participants').select('id, started_at, completed_at')

  if (!admin.canViewAllCompanies) {
    const createdEventIds = await getCreatedEventIdsForUser(admin.userId)
    participantsQuery = applyParticipantAccessScope(participantsQuery, admin.userId, createdEventIds)
  }

  if (eventFilter) {
    participantsQuery = participantsQuery.eq('event_id', eventFilter)
  }

  if (companyFilter) {
    participantsQuery = participantsQuery.eq('company', companyFilter)
  }

  const { data: participants } = await participantsQuery

  const totalInvited = participants?.length ?? 0
  const totalStarted = participants?.filter((participant) => participant.started_at !== null).length ?? 0
  const totalCompleted = participants?.filter((participant) => participant.completed_at !== null).length ?? 0
  const completionRate = totalInvited > 0 ? Math.round((totalCompleted / totalInvited) * 100) : 0

  const participantIds = participants?.map((participant) => participant.id) ?? []
  if (participantIds.length === 0) {
    return {
      total_invited: totalInvited,
      total_started: totalStarted,
      total_completed: totalCompleted,
      completion_rate: completionRate,
      avg_score: null,
      profile_distribution: {},
    }
  }

  const { data: responses } = await supabase
    .from('responses')
    .select('score_total, profile_label, participant_id')
    .in('participant_id', participantIds)
    .not('score_total', 'is', null)

  const scores = responses?.map((response) => response.score_total).filter((score): score is number => score !== null) ?? []
  const avgScore = scores.length > 0 ? Math.round((scores.reduce((acc, current) => acc + current, 0) / scores.length) * 10) / 10 : null

  const profileDistribution: Record<string, number> = {}
  for (const response of responses ?? []) {
    if (response.profile_label) {
      profileDistribution[response.profile_label] = (profileDistribution[response.profile_label] ?? 0) + 1
    }
  }

  return {
    total_invited: totalInvited,
    total_started: totalStarted,
    total_completed: totalCompleted,
    completion_rate: completionRate,
    avg_score: avgScore,
    profile_distribution: profileDistribution,
  }
}

export interface ResultRow extends ResultDetailFields {
  id: string
  event_name: string | null
  company: string | null
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
}

export async function getResults(eventId?: string, company?: string): Promise<ResultRow[]> {
  const admin = await getCurrentAdminContext()
  if (!admin.userId) return []

  const supabase = createServerClient()
  const eventFilter = normalizeEventFilter(eventId)
  const companyFilter = normalizeCompanyFilter(company)

  let participantsQuery = supabase
    .from('participants')
    .select('id, event_id, company, full_name, corporate_email, area, management_unit, role, completed_at')
    .eq('token_status', 'used')
    .order('completed_at', { ascending: false })

  if (!admin.canViewAllCompanies) {
    const createdEventIds = await getCreatedEventIdsForUser(admin.userId)
    participantsQuery = applyParticipantAccessScope(participantsQuery, admin.userId, createdEventIds)
  }

  if (eventFilter) {
    participantsQuery = participantsQuery.eq('event_id', eventFilter)
  }

  if (companyFilter) {
    participantsQuery = participantsQuery.eq('company', companyFilter)
  }

  const { data: participants } = await participantsQuery
  if (!participants || participants.length === 0) return []

  const eventIds = Array.from(new Set(participants.map((participant) => participant.event_id).filter(Boolean)))

  const [{ data: responses }, { data: events }] = await Promise.all([
    supabase
      .from('responses')
      .select(
        'participant_id, score_total, profile_label, score_usage, score_integration, score_value_signal, score_opportunity_clarity, q1_tools_used, q2_integration, q3_use_cases, q3_use_cases_other, q4_success_case_raw, q4_followup_raw, q5_barrier, q5_barrier_other, q6_opportunity_raw, q6_followup_raw, ai_summary, ai_tags, barrier_tags, opportunity_tags, has_success_case, success_case_summary, strength_summary, next_step_recommendation'
      )
      .in('participant_id', participants.map((participant) => participant.id))
      .not('score_total', 'is', null),
    eventIds.length > 0
      ? supabase.from('events').select('id, name').in('id', eventIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }>, error: null }),
  ])

  const responseMap = new Map(responses?.map((response) => [response.participant_id, response]) ?? [])
  const eventMap = new Map(events?.map((event) => [event.id, event.name]) ?? [])

  return participants.map((participant) => {
    const response = responseMap.get(participant.id)
    return {
      id: participant.id,
      event_name: participant.event_id ? eventMap.get(participant.event_id) ?? null : null,
      company: participant.company,
      full_name: participant.full_name,
      corporate_email: participant.corporate_email,
      area: participant.area,
      management_unit: participant.management_unit,
      role: participant.role,
      completed_at: participant.completed_at,
      score_total: response?.score_total ?? null,
      profile_label: response?.profile_label ?? null,
      score_usage: response?.score_usage ?? null,
      score_integration: response?.score_integration ?? null,
      score_value_signal: response?.score_value_signal ?? null,
      score_opportunity_clarity: response?.score_opportunity_clarity ?? null,
      q1_tools_used: response?.q1_tools_used ?? null,
      q2_integration: response?.q2_integration ?? null,
      q3_use_cases: response?.q3_use_cases ?? null,
      q3_use_cases_other: response?.q3_use_cases_other ?? null,
      q4_success_case_raw: response?.q4_success_case_raw ?? null,
      q4_followup_raw: response?.q4_followup_raw ?? null,
      q5_barrier: response?.q5_barrier ?? null,
      q5_barrier_other: response?.q5_barrier_other ?? null,
      q6_opportunity_raw: response?.q6_opportunity_raw ?? null,
      q6_followup_raw: response?.q6_followup_raw ?? null,
      ai_summary: response?.ai_summary ?? null,
      ai_tags: response?.ai_tags ?? null,
      barrier_tags: response?.barrier_tags ?? null,
      opportunity_tags: response?.opportunity_tags ?? null,
      has_success_case: response?.has_success_case ?? false,
      success_case_summary: response?.success_case_summary ?? null,
      next_step_recommendation: response?.next_step_recommendation ?? null,
      strength_summary: response?.strength_summary ?? null,
    }
  })
}

export async function exportResultsCsv(eventId?: string, company?: string): Promise<string> {
  const results = await getResults(eventId, company)
  return buildResultsCsv(results)
}

export interface ParticipantAdminRow {
  id: string
  event_name: string | null
  company: string | null
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

export async function getParticipantsAdmin(eventId?: string, company?: string): Promise<ParticipantAdminRow[]> {
  const admin = await getCurrentAdminContext()
  if (!admin.userId) return []

  const supabase = createServerClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const eventFilter = normalizeEventFilter(eventId)
  const companyFilter = normalizeCompanyFilter(company)

  let participantsQuery = supabase
    .from('participants')
    .select('id, event_id, company, full_name, corporate_email, area, management_unit, role, access_token, completed_at, token_status')
    .order('created_at', { ascending: false })

  if (!admin.canViewAllCompanies) {
    const createdEventIds = await getCreatedEventIdsForUser(admin.userId)
    participantsQuery = applyParticipantAccessScope(participantsQuery, admin.userId, createdEventIds)
  }

  if (eventFilter) {
    participantsQuery = participantsQuery.eq('event_id', eventFilter)
  }

  if (companyFilter) {
    participantsQuery = participantsQuery.eq('company', companyFilter)
  }

  const { data: participants, error } = await participantsQuery
  if (error || !participants) return []

  const eventIds = Array.from(new Set(participants.map((participant) => participant.event_id).filter(Boolean)))
  const { data: events } =
    eventIds.length > 0 ? await supabase.from('events').select('id, name').in('id', eventIds) : { data: [] as Array<{ id: string; name: string }> }

  const eventMap = new Map(events?.map((event) => [event.id, event.name]) ?? [])

  return participants.map((participant) => {
    const done = participant.token_status === 'used' && !!participant.completed_at
    return {
      id: participant.id,
      event_name: participant.event_id ? eventMap.get(participant.event_id) ?? null : null,
      company: participant.company,
      full_name: participant.full_name,
      corporate_email: participant.corporate_email,
      area: participant.area,
      management_unit: participant.management_unit,
      role: participant.role,
      access_token: participant.access_token,
      completed_at: participant.completed_at,
      token_status: participant.token_status,
      status_label: done ? 'Concluida / PDF listo' : 'Pendiente',
      link: `${appUrl}/pulso?t=${participant.access_token}`,
    }
  })
}

export async function exportParticipantsCsv(eventId?: string, company?: string): Promise<string> {
  const rows = await getParticipantsAdmin(eventId, company)
  return buildParticipantsCsv(
    rows.map((row) => ({
      event_name: row.event_name,
      company: row.company,
      full_name: row.full_name,
      corporate_email: row.corporate_email,
      area: row.area,
      management_unit: row.management_unit,
      role: row.role,
      link: row.link,
      status: row.status_label,
    }))
  )
}

export async function deleteParticipant(id: string): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: 'ID inválido' }

  const admin = await getCurrentAdminContext()
  if (!admin.userId) return { success: false, error: 'Usuario no autenticado' }

  const supabase = createServerClient()

  if (!admin.canViewAllCompanies) {
    const createdEventIds = await getCreatedEventIdsForUser(admin.userId)
    let accessQuery = supabase.from('participants').select('id').eq('id', id)
    accessQuery = applyParticipantAccessScope(accessQuery, admin.userId, createdEventIds)

    const { data: access } = await accessQuery.maybeSingle()
    if (!access) {
      return { success: false, error: 'No autorizado para borrar este participante' }
    }
  }

  const { error: responsesErr } = await supabase.from('responses').delete().eq('participant_id', id)
  if (responsesErr) return { success: false, error: responsesErr.message }

  const { error: sessionsErr } = await supabase.from('sessions').delete().eq('participant_id', id)
  if (sessionsErr) return { success: false, error: sessionsErr.message }

  const { error: queueErr } = await supabase.from('email_queue').delete().eq('participant_id', id)
  if (queueErr) return { success: false, error: queueErr.message }

  const { error: participantErr } = await supabase.from('participants').delete().eq('id', id)
  if (participantErr) return { success: false, error: participantErr.message }

  return { success: true }
}
