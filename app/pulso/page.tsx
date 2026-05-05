import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Image from 'next/image'
import { validateToken, startSession } from '@/actions/diagnostic'

export const dynamic = 'force-dynamic'

const C = {
  bg:         '#222B2E',
  surface:    '#35424C',
  border:     '#3D4F5A',
  text:       '#FAFAFA',
  textMuted:  '#9599A2',
  textDim:    '#7B818C',
  cyan:       '#6CC5DA',
  red:        '#E52E34',
}

interface Props {
  searchParams: Promise<{ t?: string }>
}

async function handleStart(token: string, participantId: string) {
  'use server'
  const { sessionId, error } = await startSession(participantId)
  if (error || !sessionId) return

  const cookieStore = await cookies()
  cookieStore.set('diagnostic_token', token, { sameSite: 'lax', path: '/', maxAge: 60 * 60 * 4 })
  cookieStore.set('diagnostic_session', sessionId, { sameSite: 'lax', path: '/', maxAge: 60 * 60 * 4 })
  cookieStore.set('diagnostic_participant', participantId, { sameSite: 'lax', path: '/', maxAge: 60 * 60 * 4 })
  redirect('/diagnostic')
}

export default async function PulsoPage({ searchParams }: Props) {
  const params = await searchParams
  const token = params.t?.trim()

  if (!token) return <StatusScreen message="Acceso inválido." detail="Verificá el enlace recibido." />

  const result = await validateToken(token)

  if (!result.valid) {
    if (result.status === 'used')
      return <StatusScreen message="Este acceso ya fue utilizado." detail="Si creés que es un error, contactá a Recursos Humanos." />
    if (result.status === 'expired')
      return <StatusScreen message="Este acceso expiró." detail="Solicitá un nuevo enlace al equipo de Recursos Humanos." />
    return <StatusScreen message="Acceso inválido." detail="Verificá el enlace recibido o contactá a Recursos Humanos." />
  }

  const { participant } = result
  const startWithToken = handleStart.bind(null, token, participant!.id)

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 16px',
        background: C.bg,
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <div style={{ background: '#FAFAFA', borderRadius: 8, padding: '8px 16px', display: 'inline-flex', alignItems: 'center' }}>
            <Image src="/logo-oxy.png" alt="Oxy46" width={88} height={30} style={{ objectFit: 'contain', display: 'block' }} />
          </div>
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text, marginBottom: 6, letterSpacing: '-0.02em' }}>
            Pulso IA
          </h1>
          <p style={{ fontSize: 14, color: C.textMuted, letterSpacing: '0.02em' }}>
            Diagnóstico institucional de adopción de IA
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: '28px 28px 24px',
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 11, color: C.textDim, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Acceso asignado a
          </p>
          <p style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 24, letterSpacing: '-0.01em' }}>
            {participant!.full_name}
          </p>

          <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.65, marginBottom: 20 }}>
            6 preguntas · <span style={{ color: C.text, fontWeight: 600 }}>5 minutos</span> · Al finalizar recibís una devolución personalizada sobre tu perfil de uso de IA.
          </p>

          <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {[
              'Tus respuestas son confidenciales',
              'No hay respuestas correctas ni incorrectas',
              'El objetivo es generar valor para vos y para la organización',
            ].map((item) => (
              <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: C.textMuted }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.cyan, flexShrink: 0, display: 'block' }} />
                {item}
              </li>
            ))}
          </ul>

          <form action={startWithToken}>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                background: C.cyan,
                color: C.bg,
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                fontFamily: 'inherit',
              }}
            >
              Comenzar diagnóstico
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: C.textDim, letterSpacing: '0.03em' }}>
          Pulso IA · Uso interno
        </p>
      </div>
    </main>
  )
}

function StatusScreen({ message, detail }: { message: string; detail?: string }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: C.bg,
      }}
    >
      <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: '#FAFAFA', borderRadius: 8, padding: '8px 16px', display: 'inline-flex', alignItems: 'center' }}>
            <Image src="/logo-oxy.png" alt="Oxy46" width={72} height={24} style={{ objectFit: 'contain', display: 'block' }} />
          </div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '32px 24px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1A2B2E', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M10 6v4m0 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" stroke={C.cyan} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>{message}</h2>
          {detail && <p style={{ fontSize: 13, color: C.textMuted }}>{detail}</p>}
        </div>
        <p style={{ marginTop: 20, fontSize: 11, color: C.textDim }}>Pulso IA · Uso interno</p>
      </div>
    </main>
  )
}
