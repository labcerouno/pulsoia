import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Image from 'next/image'
import { startTestSession } from '@/actions/diagnostic'
import styles from '../pulso/pulso.module.css'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ error?: string }>
}

async function handleStartTest(_: FormData) {
  'use server'
  const { sessionId, error } = await startTestSession()
  if (error || !sessionId) {
    redirect('/pulso-test?error=start-test')
  }

  const cookieStore = await cookies()
  cookieStore.set('diagnostic_token', 'TEST-MODE', { sameSite: 'lax', path: '/', maxAge: 60 * 60 * 4 })
  cookieStore.set('diagnostic_session', sessionId, { sameSite: 'lax', path: '/', maxAge: 60 * 60 * 4 })
  cookieStore.set('diagnostic_participant', '00000000-0000-0000-0000-000000000001', { sameSite: 'lax', path: '/', maxAge: 60 * 60 * 4 })
  redirect('/diagnostic')
}

export default async function PulsoTestPage({ searchParams }: Props) {
  const params = await searchParams
  const hasStartError = params.error === 'start-test'

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
              <p className={styles.eyebrow}>Modo de prueba</p>
              <p className={styles.assignee}>Juan Pérez</p>

              <p className={styles.meta}>
                6 preguntas · <span className={styles.metaStrong}>5 minutos</span> · Esta sesión no será guardada en las estadísticas.
              </p>

              <ul className={styles.points}>
                {[
                  'Datos de prueba — no será almacenado',
                  'Siempre comienza desde la pregunta 1',
                  'Útil para validar el flujo o entrenar',
                ].map((item) => (
                  <li key={item} className={styles.point}>
                    {item}
                  </li>
                ))}
              </ul>

              <form action={handleStartTest}>
                <button type="submit" className={styles.startBtn}>
                  Comenzar diagnóstico
                  <span className={styles.startDot} />
                </button>
              </form>

              {hasStartError && (
                <p className={styles.meta}>
                  No pudimos iniciar la sesión de prueba. Revisá las variables de entorno de Supabase
                  (<span className={styles.metaStrong}>SUPABASE_URL</span> y <span className={styles.metaStrong}>SUPABASE_SERVICE_ROLE_KEY</span>) y volvé a intentar.
                </p>
              )}
            </div>

            <p className={styles.foot}>Pulso IA · Modo de prueba · LAS RESPUESTAS NO SE GUARDARÁN</p>
          </div>
        </section>
      </div>
    </main>
  )
}

