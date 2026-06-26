import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { upsertParticipantInvitation } from '@/lib/participants/invitations'
import { enqueueInvitationEmail } from '@/lib/email-queue'

export const runtime = 'nodejs'

const payloadSchema = z.object({
  eventSlug: z.string().trim().min(1),
  submissionId: z.string().trim().min(1),
  fullName: z.string().trim().min(1),
  corporateEmail: z.email().trim().toLowerCase(),
  company: z.string().trim().optional().nullable(),
  area: z.string().trim().optional().nullable(),
  managementUnit: z.string().trim().optional().nullable(),
  role: z.string().trim().optional().nullable(),
})

export async function POST(request: NextRequest) {
  const formsSecret = process.env.GOOGLE_FORMS_WEBHOOK_SECRET

  if (!formsSecret) {
    return NextResponse.json({ ok: false, error: 'GOOGLE_FORMS_WEBHOOK_SECRET no configurado' }, { status: 500 })
  }

  const receivedSecret = request.headers.get('x-pulso-forms-secret')

  if (receivedSecret !== formsSecret) {
    return NextResponse.json({ ok: false, error: 'Secret invalido' }, { status: 401 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON invalido' }, { status: 400 })
  }

  const parsed = payloadSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Payload invalido',
        details: z.treeifyError(parsed.error),
      },
      { status: 400 }
    )
  }

  try {
    const supabase = createServerClient()
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, slug')
      .eq('slug', parsed.data.eventSlug)
      .eq('status', 'active')
      .maybeSingle()

    if (eventError) {
      throw new Error(`No se pudo buscar evento: ${eventError.message}`)
    }

    if (!event) {
      return NextResponse.json({ ok: false, error: 'Evento activo no encontrado' }, { status: 404 })
    }

    const invitation = await upsertParticipantInvitation({
      eventId: event.id,
      fullName: parsed.data.fullName,
      corporateEmail: parsed.data.corporateEmail,
      company: parsed.data.company,
      area: parsed.data.area,
      managementUnit: parsed.data.managementUnit,
      role: parsed.data.role,
      source: 'google_forms',
      externalSubmissionId: parsed.data.submissionId,
    })

    const queueResult = await enqueueInvitationEmail(invitation.participant.id, event.id)

    return NextResponse.json({
      ok: true,
      created: invitation.created,
      emailStatus: queueResult.status,
      link: invitation.link,
    })
  } catch (error) {
    console.error('[integrations/google-forms] error:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}