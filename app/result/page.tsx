import { redirect } from 'next/navigation'
import Image from 'next/image'
import { getResultByToken } from '@/actions/diagnostic'
import type { ProfileLabel } from '@/lib/supabase/types'
import CopyButton from './CopyButton'
import { buildActionPlan, toSecondPerson } from '@/lib/action-plan'
import { getHeadline, shortCongrats } from '@/lib/result-texts'
import styles from './result.module.css'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ t?: string }>
}

const STEP_BY_LEVEL: Record<ProfileLabel, string> = {
  OBSERVADOR: 'Defini una tarea puntual de menos de 20 minutos y usá IA hoy para resolver solo esa parte. Medí tiempo antes y después.',
  EXPLORADOR: 'Elegí una tarea semanal concreta (reporte, resumen o análisis), creá un mini flujo con IA y repetilo durante 2 semanas.',
  'USUARIO ACTIVO': 'Tomá un proceso real de tu área y estandarizalo con checklist: entrada, validación y salida. Esto te sube calidad y velocidad.',
  MULTIPLICADOR: 'Armá un caso replicable de tu equipo con impacto medible (tiempo, errores, retrabajo) y compartilo en una sesión corta.',
  REFERENTE: 'Definí un plan de adopción por frente (operación, análisis, comunicación) y asigná un responsable por frente con objetivo semanal.',
}

const LEVEL1_TIPS = [
  'Si la IA alucina, pedile fuentes y valida en un documento oficial.',
  'Con 15 minutos al dia aparecen resultados concretos en pocas semanas.',
  'Empeza por tareas repetitivas: resumenes, borradores o clasificacion.',
  'Pedi siempre version corta y version detallada para comparar calidad.',
]

function resolveProvider(aiTags: string[] | null): string {
  const providerTag = aiTags?.find((tag) => tag.startsWith('provider:'))
  const value = providerTag?.replace('provider:', '')
  if (value === 'openai') return 'OpenAI'
  if (value === 'anthropic') return 'Anthropic'
  return 'Fallback local'
}

export default async function ResultPage({ searchParams }: Props) {
  const params = await searchParams
  const token = params.t?.trim()
  if (!token) redirect('/pulso')

  const data = await getResultByToken(token)

  if (!data.found || !data.participant || !data.response) {
    return (
      <main className={styles.errorShell}>
        <div className={styles.errorCard}>
          <h2 className={styles.errorTitle}>Resultado no disponible</h2>
          <p className={styles.errorText}>No encontramos un diagnostico completado para este acceso.</p>
        </div>
      </main>
    )
  }

  const { participant, response } = data
  const profile: ProfileLabel = (response.profile_label as ProfileLabel) ?? 'OBSERVADOR'
  const strength = toSecondPerson(response.strength_summary || shortCongrats(profile))
  const nextStep = toSecondPerson(response.next_step_recommendation || STEP_BY_LEVEL[profile])
  const provider = resolveProvider(response.ai_tags)
  const isLevel1 = profile === 'OBSERVADOR'
  const actionPlan = buildActionPlan({
    profile,
    opportunity: response.q6_opportunity_raw,
    area: participant.area,
    role: participant.role,
    tools: response.q1_tools_used,
    nextStep,
  })
  const downloadHref = `/api/result/pdf?t=${encodeURIComponent(token)}`

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.head}>
          <div className={styles.logoChip}>
            <Image src="/logo-oxy.png" alt="OXY46" width={108} height={30} style={{ objectFit: 'contain', display: 'block', width: 'auto', height: 'auto' }} />
          </div>
          <div className={styles.who}>{participant.full_name} · {participant.area}</div>
        </div>
        <div className={styles.rule} />

        <section className={`${styles.section} ${styles.hero}`}>
          <div className={styles.eyebrow}>Tu resultado</div>
          <h1 className={styles.heroTitle}>
            {getHeadline(profile)}<span className={styles.dot}>.</span>
          </h1>
          <p className={styles.sub}>{shortCongrats(profile)}</p>
          <span className={styles.badge}>Devolución generada con {provider}</span>
        </section>

        <section className={`${styles.section} ${styles.hairlineTop}`}>
          <div className={styles.eyebrow}>{isLevel1 ? 'Impulso inicial' : 'Fortaleza principal'}</div>
          <p className={styles.lead}>{strength}</p>
        </section>

        {isLevel1 ? (
          <section className={`${styles.section} ${styles.hairlineTop}`}>
            <div className={styles.eyebrow}>Tips rápidos para arrancar</div>
            <ul style={{ display: 'grid', gap: 8, color: '#5b6573', fontSize: 14, lineHeight: 1.5, paddingLeft: 0, margin: 0 }}>
              {LEVEL1_TIPS.map((tip) => (
                <li key={tip} style={{ listStyle: 'none', display: 'flex', gap: 8 }}>
                  <span style={{ color: '#8a6f44' }}>•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={`${styles.section} ${styles.hairlineTop}`}>
          <div className={styles.eyebrow}>Próximo paso sugerido</div>
          <p className={styles.stepIntro}>{actionPlan.intro}</p>

          <div className={styles.card}>
            <div className={styles.cardEyebrow}>Prompt para empezar</div>
            <div className={styles.promptWrap}>
              <div className={styles.promptBox}>
                <p className={styles.promptText}>{actionPlan.prompt}</p>
              </div>
              <CopyButton text={actionPlan.prompt} />
            </div>
          </div>

          <a href={downloadHref} download className={styles.downloadBtn}>
            Descargar esta devolución en PDF
          </a>
        </section>

        <section className={styles.note}>
          <p>Nos vemos en la próxima sesión en vivo del programa de capacitación de IA. <em>Traé tus consultas</em> así te podemos ayudar.</p>
        </section>

        <footer className={styles.footer}>
          <span>Pulso IA · Uso interno</span>
          <span className={styles.footerGen}>Generado por OXY46</span>
        </footer>
      </div>
    </main>
  )
}
