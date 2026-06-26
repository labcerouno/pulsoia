import { createServerClient } from '@/lib/supabase/server'
import { generateToken } from '@/lib/tokens'

type InvitationSource = 'csv' | 'google_forms'

interface UpsertInvitationInput {
  eventId: string
  fullName: string
  corporateEmail: string
  company?: string | null
  area?: string | null
  managementUnit?: string | null
  role?: string | null
  source: InvitationSource
  externalSubmissionId?: string | null
}

interface ParticipantInvitationRow {
  id: string
  full_name: string
  corporate_email: string
  access_token: string
  event_id: string
}

export interface UpsertInvitationResult {
  participant: ParticipantInvitationRow
  link: string
  created: boolean
  emailChanged: boolean
}

function trimOrNull(value?: string | null): string | null {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : null
}

function buildInvitationLink(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${appUrl}/pulso?t=${token}`
}

export async function upsertParticipantInvitation(input: UpsertInvitationInput): Promise<UpsertInvitationResult> {
  const supabase = createServerClient()

  const fullName = input.fullName.trim()
  const corporateEmail = input.corporateEmail.trim().toLowerCase()
  const externalSubmissionId = trimOrNull(input.externalSubmissionId)

  if (!fullName) {
    throw new Error('fullName es requerido')
  }

  if (!corporateEmail) {
    throw new Error('corporateEmail es requerido')
  }

  if (input.source === 'google_forms' && !externalSubmissionId) {
    throw new Error('externalSubmissionId es requerido para source=google_forms')
  }

  let existing: ParticipantInvitationRow | null = null

  if (externalSubmissionId) {
    const { data, error } = await supabase
      .from('participants')
      .select('id, full_name, corporate_email, access_token, event_id')
      .eq('event_id', input.eventId)
      .eq('external_submission_id', externalSubmissionId)
      .maybeSingle()

    if (error) {
      throw new Error(`No se pudo consultar participante existente: ${error.message}`)
    }

    existing = data
  }

  const basePayload = {
    full_name: fullName,
    corporate_email: corporateEmail,
    company: trimOrNull(input.company),
    area: trimOrNull(input.area),
    management_unit: trimOrNull(input.managementUnit),
    role: trimOrNull(input.role),
    event_id: input.eventId,
    source: input.source,
    external_submission_id: externalSubmissionId,
  }

  if (existing) {
    const emailChanged = existing.corporate_email.toLowerCase() !== corporateEmail

    const { data: updated, error: updateError } = await supabase
      .from('participants')
      .update(basePayload)
      .eq('id', existing.id)
      .select('id, full_name, corporate_email, access_token, event_id')
      .single()

    if (updateError || !updated) {
      throw new Error(`No se pudo actualizar participante: ${updateError?.message || 'sin detalle'}`)
    }

    return {
      participant: updated,
      link: buildInvitationLink(updated.access_token),
      created: false,
      emailChanged,
    }
  }

  const token = generateToken()

  const { data: created, error: insertError } = await supabase
    .from('participants')
    .insert({
      ...basePayload,
      access_token: token,
      token_status: 'unused',
      invited_at: new Date().toISOString(),
    })
    .select('id, full_name, corporate_email, access_token, event_id')
    .single()

  if (insertError || !created) {
    throw new Error(`No se pudo crear participante: ${insertError?.message || 'sin detalle'}`)
  }

  return {
    participant: created,
    link: buildInvitationLink(created.access_token),
    created: true,
    emailChanged: false,
  }
}