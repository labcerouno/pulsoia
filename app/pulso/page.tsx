import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Image from 'next/image'
import { validateToken, startSession } from '@/actions/diagnostic'
import styles from './pulso.module.css'

export const dynamic = 'force-dynamic'

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
    <main className={styles.page}>
      <div className={styles.wrap}>
        <section className={styles.device}>
          <div className={styles.inner}>
            <div className={styles.top}>
              <div className={styles.logoChip}>
                <Image src="/logo-oxy.png" alt="Oxy46" width={108} height={26} style={{ objectFit: 'contain', display: 'block', height: 26, width: 'auto' }} />
              </div>
            </div>

            <h1 className={styles.h1}>
              Pulso IA<span className={styles.dot}>.</span>
            </h1>
            <p className={styles.tagline}>Diagnóstico institucional de adopción de IA</p>

            <div className={styles.card}>
              <p className={styles.eyebrow}>Acceso asignado a</p>
              <p className={styles.assignee}>{participant!.full_name}</p>

              <p className={styles.meta}>
                6 preguntas · <span className={styles.metaStrong}>5 minutos</span> · Al finalizar recibís una devolución personalizada sobre tu perfil de uso de IA.
              </p>

              <ul className={styles.points}>
                {[
                  'Tus respuestas son confidenciales',
                  'No hay respuestas correctas ni incorrectas',
                  'El objetivo es generar valor para vos y para la organización',
                ].map((item) => (
                  <li key={item} className={styles.point}>
                    {item}
                  </li>
                ))}
              </ul>

              <form action={startWithToken}>
                <button type="submit" className={styles.startBtn}>
                  Comenzar diagnóstico
                  <span className={styles.startDot} />
                </button>
              </form>
            </div>

            <p className={styles.foot}>Pulso IA · Uso interno</p>
          </div>
        </section>
      </div>
    </main>
  )
}

function StatusScreen({ message, detail }: { message: string; detail?: string }) {
  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <section className={styles.device}>
          <div className={styles.inner}>
            <div className={styles.top}>
              <div className={styles.logoChip}>
                <Image src="/logo-oxy.png" alt="Oxy46" width={108} height={26} style={{ objectFit: 'contain', display: 'block', height: 26, width: 'auto' }} />
              </div>
            </div>
            <h1 className={styles.h1}>
              Pulso IA<span className={styles.dot}>.</span>
            </h1>
            <p className={styles.tagline}>Diagnóstico institucional de adopción de IA</p>
            <div className={styles.statusCard}>
              <h2 className={styles.statusTitle}>{message}</h2>
              {detail && <p className={styles.statusDetail}>{detail}</p>}
            </div>
            <p className={styles.foot}>Pulso IA · Uso interno</p>
          </div>
        </section>
      </div>
    </main>
  )
}
