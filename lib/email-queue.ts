import { Resend } from 'resend'
import { createServerClient } from '@/lib/supabase/server'

interface QueueParticipantRow {
  id: string
  full_name: string
  corporate_email: string
  access_token: string
  email_status: 'not_queued' | 'queued' | 'sent' | 'failed'
}

interface QueueEmailRow {
  id: string
  participant_id: string
  to_email: string
  subject: string
  html: string
  attempts: number
}

export interface EnqueueInvitationEmailResult {
  status: 'sent' | 'queued' | 'already_queued' | 'already_sent'
}

export interface ProcessEmailQueueResult {
  quotaDate: string
  dailyLimit: number
  sentTodayBeforeRun: number
  sentInRun: number
  pendingSelected: number
  remainingAfterRun: number
}

function getQuotaDate(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  }
}

function getDailyLimit(): number {
  const parsed = Number.parseInt(process.env.RESEND_DAILY_LIMIT || '100', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100
}

function getInvitationEmailContent(fullName: string, link: string): { subject: string; html: string } {
  return {
    subject: 'Tu invitacion a Pulso IA',
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 12px;">Invitacion a Pulso IA</h2>
        <p>Hola ${fullName},</p>
        <p>Te compartimos tu acceso personal para completar el diagnostico institucional de adopcion de IA.</p>
        <p>
          <a href="${link}" style="display: inline-block; padding: 10px 16px; background: #111827; color: #ffffff; border-radius: 8px; text-decoration: none;">
            Ingresar al Pulso IA
          </a>
        </p>
        <p>Si el boton no funciona, copiá y pegá este link en tu navegador:</p>
        <p><a href="${link}">${link}</a></p>
      </div>
    `,
  }
}

export async function enqueueInvitationEmail(participantId: string, eventId: string): Promise<EnqueueInvitationEmailResult> {
  const supabase = createServerClient()

  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('id, full_name, corporate_email, access_token, email_status')
    .eq('id', participantId)
    .single<QueueParticipantRow>()

  if (participantError || !participant) {
    throw new Error(`No se pudo obtener participante para cola: ${participantError?.message || 'sin detalle'}`)
  }

  const { data: activeQueueRows, error: queueLookupError } = await supabase
    .from('email_queue')
    .select('id')
    .eq('participant_id', participant.id)
    .eq('to_email', participant.corporate_email)
    .in('status', ['pending', 'sending'])
    .limit(1)

  if (queueLookupError) {
    throw new Error(`No se pudo validar cola activa: ${queueLookupError.message}`)
  }

  if ((activeQueueRows?.length || 0) > 0) {
    return { status: 'already_queued' }
  }

  if (participant.email_status === 'sent') {
    const { data: sentEmail, error: sentEmailError } = await supabase
      .from('email_queue')
      .select('to_email')
      .eq('participant_id', participant.id)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sentEmailError) {
      throw new Error(`No se pudo validar ultimo email enviado: ${sentEmailError.message}`)
    }

    if (sentEmail && sentEmail.to_email.toLowerCase() === participant.corporate_email.toLowerCase()) {
      return { status: 'already_sent' }
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const link = `${appUrl}/pulso?t=${participant.access_token}`
  const email = getInvitationEmailContent(participant.full_name, link)

  const { error: insertQueueError } = await supabase.from('email_queue').insert({
    participant_id: participant.id,
    event_id: eventId,
    to_email: participant.corporate_email,
    subject: email.subject,
    html: email.html,
    status: 'pending',
    attempts: 0,
    send_after: new Date().toISOString(),
  })

  if (insertQueueError) {
    throw new Error(`No se pudo encolar email: ${insertQueueError.message}`)
  }

  // Intentar envío inmediato si RESEND_API_KEY está disponible
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const from = process.env.RESEND_INVITATION_FROM || 'Pulso IA <ia@oxy46.com>'

      const { error: sendError } = await resend.emails.send({
        from,
        to: participant.corporate_email,
        subject: email.subject,
        html: email.html,
      })

      if (sendError) {
        throw new Error(JSON.stringify(sendError))
      }

      const nowIso = new Date().toISOString()

      await supabase
        .from('email_queue')
        .update({ status: 'sent', attempts: 1, sent_at: nowIso, last_error: null })
        .eq('participant_id', participant.id)
        .eq('to_email', participant.corporate_email)
        .eq('status', 'pending')

      await supabase
        .from('participants')
        .update({ email_status: 'sent', email_sent_at: nowIso, email_error: null })
        .eq('id', participant.id)

      // Incrementar contador de cuota diaria
      const timeZone = process.env.EMAIL_QUOTA_TIMEZONE || 'America/Argentina/Cordoba'
      const quotaDate = getQuotaDate(timeZone)
      const { data: usageRow } = await supabase
        .from('email_daily_usage')
        .select('sent_count')
        .eq('quota_date', quotaDate)
        .maybeSingle()

      if (usageRow) {
        await supabase
          .from('email_daily_usage')
          .update({ sent_count: usageRow.sent_count + 1 })
          .eq('quota_date', quotaDate)
      } else {
        await supabase
          .from('email_daily_usage')
          .insert({ quota_date: quotaDate, sent_count: 1 })
      }

      return { status: 'sent' }
    } catch (sendErr) {
      // Si falla el envío inmediato, queda en cola para el cron
      console.error('[enqueueInvitationEmail] envio inmediato fallo, queda en cola:', sendErr)

      await supabase
        .from('participants')
        .update({ email_status: 'queued', email_error: null, email_sent_at: null })
        .eq('id', participant.id)

      return { status: 'queued' }
    }
  }

  // Sin RESEND_API_KEY: solo encolar, el cron lo enviará
  const { error: participantUpdateError } = await supabase
    .from('participants')
    .update({ email_status: 'queued', email_error: null, email_sent_at: null })
    .eq('id', participant.id)

  if (participantUpdateError) {
    throw new Error(`No se pudo actualizar estado de email del participante: ${participantUpdateError.message}`)
  }

  return { status: 'queued' }
}

function getRetryDate(attempts: number): string {
  const minutes = Math.min(60, 5 * attempts)
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

export async function processEmailQueue(): Promise<ProcessEmailQueueResult> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no configurada')
  }

  const timeZone = process.env.EMAIL_QUOTA_TIMEZONE || 'America/Argentina/Cordoba'
  const dailyLimit = getDailyLimit()
  const quotaDate = getQuotaDate(timeZone)
  const supabase = createServerClient()

  const { data: usageRow, error: usageError } = await supabase
    .from('email_daily_usage')
    .select('quota_date, sent_count')
    .eq('quota_date', quotaDate)
    .maybeSingle()

  if (usageError) {
    throw new Error(`No se pudo consultar uso diario de email: ${usageError.message}`)
  }

  let sentToday = usageRow?.sent_count || 0

  if (!usageRow) {
    const { error: createUsageError } = await supabase
      .from('email_daily_usage')
      .insert({ quota_date: quotaDate, sent_count: 0 })

    if (createUsageError) {
      throw new Error(`No se pudo inicializar uso diario de email: ${createUsageError.message}`)
    }
  }

  const remainingBeforeRun = Math.max(0, dailyLimit - sentToday)

  if (remainingBeforeRun <= 0) {
    return {
      quotaDate,
      dailyLimit,
      sentTodayBeforeRun: sentToday,
      sentInRun: 0,
      pendingSelected: 0,
      remainingAfterRun: 0,
    }
  }

  const nowIso = new Date().toISOString()
  const { data: rows, error: queueError } = await supabase
    .from('email_queue')
    .select('id, participant_id, to_email, subject, html, attempts')
    .eq('status', 'pending')
    .lte('send_after', nowIso)
    .order('created_at', { ascending: true })
    .limit(remainingBeforeRun)
    .returns<QueueEmailRow[]>()

  if (queueError) {
    throw new Error(`No se pudo leer cola de email: ${queueError.message}`)
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_INVITATION_FROM || 'Pulso IA <ia@oxy46.com>'

  let sentInRun = 0

  for (const row of rows || []) {
    const { data: markedAsSending, error: markSendingError } = await supabase
      .from('email_queue')
      .update({ status: 'sending' })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (markSendingError) {
      console.error('[processEmailQueue] mark sending error:', markSendingError)
      continue
    }

    if (!markedAsSending) {
      continue
    }

    try {
      const { error: sendError } = await resend.emails.send({
        from,
        to: row.to_email,
        subject: row.subject,
        html: row.html,
      })

      if (sendError) {
        throw new Error(JSON.stringify(sendError))
      }

      const { error: sentUpdateError } = await supabase
        .from('email_queue')
        .update({
          status: 'sent',
          attempts: row.attempts + 1,
          sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', row.id)

      if (sentUpdateError) {
        console.error('[processEmailQueue] queue sent update error:', sentUpdateError)
      }

      const { error: participantSentError } = await supabase
        .from('participants')
        .update({
          email_status: 'sent',
          email_sent_at: new Date().toISOString(),
          email_error: null,
        })
        .eq('id', row.participant_id)

      if (participantSentError) {
        console.error('[processEmailQueue] participant sent update error:', participantSentError)
      }

      sentInRun += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const attempts = row.attempts + 1
      const failed = attempts >= 3

      const { error: queueFailError } = await supabase
        .from('email_queue')
        .update({
          status: failed ? 'failed' : 'pending',
          attempts,
          last_error: message,
          send_after: failed ? new Date().toISOString() : getRetryDate(attempts),
        })
        .eq('id', row.id)

      if (queueFailError) {
        console.error('[processEmailQueue] queue failure update error:', queueFailError)
      }

      const { error: participantFailError } = await supabase
        .from('participants')
        .update({
          email_status: failed ? 'failed' : 'queued',
          email_error: message,
        })
        .eq('id', row.participant_id)

      if (participantFailError) {
        console.error('[processEmailQueue] participant failure update error:', participantFailError)
      }
    }
  }

  if (sentInRun > 0) {
    sentToday += sentInRun

    const { error: updateUsageError } = await supabase
      .from('email_daily_usage')
      .update({ sent_count: sentToday })
      .eq('quota_date', quotaDate)

    if (updateUsageError) {
      throw new Error(`No se pudo actualizar uso diario de email: ${updateUsageError.message}`)
    }
  }

  return {
    quotaDate,
    dailyLimit,
    sentTodayBeforeRun: usageRow?.sent_count || 0,
    sentInRun,
    pendingSelected: rows?.length || 0,
    remainingAfterRun: Math.max(0, dailyLimit - sentToday),
  }
}