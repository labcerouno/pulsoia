import { NextRequest, NextResponse } from 'next/server'
import { processEmailQueue } from '@/lib/email-queue'

export const runtime = 'nodejs'

async function handleRun(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET no configurado' }, { status: 500 })
  }

  const authorization = request.headers.get('authorization')

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const result = await processEmailQueue()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('[jobs/send-email-queue] error:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handleRun(request)
}

export async function POST(request: NextRequest) {
  return handleRun(request)
}