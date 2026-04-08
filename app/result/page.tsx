import { redirect } from 'next/navigation'
import Image from 'next/image'
import { getResultByToken } from '@/actions/diagnostic'
import type { ProfileLabel } from '@/lib/supabase/types'
import CopyButton from './CopyButton'
import { buildActionPlan, toSecondPerson } from '@/lib/action-plan'

export const dynamic = 'force-dynamic'

const C = {
  bg: '#222B2E',
  surface: '#35424C',
  border: '#3D4F5A',
  text: '#FAFAFA',
  textMuted: '#9599A2',
  textDim: '#7B818C',
  cyan: '#6CC5DA',
  green: '#61D49A',
  amber: '#E8A83E',
}

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

function shortCongrats(profile: ProfileLabel): string {
  if (profile === 'OBSERVADOR') {
    return 'Estas en una etapa inicial. Con pasos chicos y consistentes vas a notar avances rapido.'
  }
  if (profile === 'EXPLORADOR') {
    return 'Buen avance: ya estas probando IA en tu trabajo.'
  }
  if (profile === 'USUARIO ACTIVO') {
    return 'Excelente ritmo: ya convertiste IA en una herramienta de trabajo.'
  }
  if (profile === 'MULTIPLICADOR') {
    return 'Gran nivel: ya estas generando impacto y podes impulsar a otros.'
  }
  return 'Nivel sobresaliente: tu experiencia puede acelerar a todo el equipo.'
}

function getHeadline(profile: ProfileLabel): string {
  if (profile === 'OBSERVADOR') {
    return 'Buen comienzo: estás abriendo una oportunidad concreta para mejorar tu forma de trabajo.'
  }
  return 'Felicitaciones: ya estás construyendo una forma de trabajo más inteligente con IA.'
}

function pickResourceLink(response: {
  q3_use_cases: string[] | null
  q5_barrier: string | null
  q5_barrier_other: string | null
}): { label: string; url: string } {
  const useCases = response.q3_use_cases ?? []
  const barrier = (response.q5_barrier_other || response.q5_barrier || '').toLowerCase()

  if (barrier.includes('seguridad') || barrier.includes('confidencial')) {
    return {
      label: 'Guía de buenas prácticas de seguridad para IA',
      url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
    }
  }

  if (useCases.some((u) => u.toLowerCase().includes('excel') || u.toLowerCase().includes('análisis'))) {
    return {
      label: 'Guía práctica para análisis de datos con IA',
      url: 'https://platform.openai.com/docs/guides/data-analysis',
    }
  }

  if (useCases.some((u) => u.toLowerCase().includes('transcribir') || u.toLowerCase().includes('llamada'))) {
    return {
      label: 'Guía de transcripción y resumen de reuniones',
      url: 'https://platform.openai.com/docs/guides/speech-to-text',
    }
  }

  if (useCases.some((u) => u.toLowerCase().includes('informe') || u.toLowerCase().includes('texto'))) {
    return {
      label: 'Guía de redacción profesional asistida por IA',
      url: 'https://platform.openai.com/docs/guides/text?api-mode=chat',
    }
  }

  return {
    label: 'Guía base de trabajo con IA para productividad',
    url: 'https://platform.openai.com/docs/guides/prompt-engineering',
  }
}

export default async function ResultPage({ searchParams }: Props) {
  const params = await searchParams
  const token = params.t?.trim()
  if (!token) redirect('/bcr')

  const data = await getResultByToken(token)

  if (!data.found || !data.participant || !data.response) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: C.bg }}>
        <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '40px 24px' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>Resultado no disponible</h2>
            <p style={{ fontSize: 13, color: C.textMuted }}>No encontramos un diagnostico completado para este acceso.</p>
          </div>
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
  const resource = pickResourceLink({
    q3_use_cases: response.q3_use_cases,
    q5_barrier: response.q5_barrier,
    q5_barrier_other: response.q5_barrier_other,
  })
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
    <main style={{ minHeight: '100vh', background: C.bg, padding: '0 0 52px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ padding: '20px 0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, marginBottom: 22 }}>
          <div style={{ background: '#FAFAFA', borderRadius: 6, padding: '5px 10px', display: 'inline-flex', alignItems: 'center' }}>
            <Image src="/logo-oxy.png" alt="Oxy46" width={60} height={22} style={{ objectFit: 'contain', display: 'block' }} />
          </div>
          <p style={{ fontSize: 13, color: C.textMuted }}>{participant.full_name}</p>
        </div>

        <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '22px 20px', marginBottom: 14 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim, marginBottom: 8 }}>Tu resultado</p>
          <h2 style={{ fontSize: 20, color: C.text, letterSpacing: '-0.02em', marginBottom: 8 }}>{getHeadline(profile)}</h2>
          <h1 style={{ fontSize: 30, color: C.text, letterSpacing: '-0.03em', marginBottom: 8 }}>{response.score_total ?? 0}/12</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: C.textMuted }}>{shortCongrats(profile)}</p>
          <div style={{ marginTop: 12, display: 'inline-flex', padding: '4px 10px', borderRadius: 999, border: `1px solid ${C.border}`, color: C.textDim, fontSize: 11 }}>
            Devolucion generada con {provider}
          </div>
        </section>

        <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '22px 20px', marginBottom: 14 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textDim, marginBottom: 8 }}>
            {isLevel1 ? 'Impulso inicial' : 'Fortaleza principal'}
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: C.text }}>{strength}</p>
        </section>

        {isLevel1 ? (
          <section style={{ background: C.surface, border: `1px solid ${C.amber}55`, borderRadius: 16, padding: '22px 20px', marginBottom: 14 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.amber, marginBottom: 10 }}>Tips rapidos para arrancar</p>
            <ul style={{ display: 'grid', gap: 8, color: C.textMuted, fontSize: 14, lineHeight: 1.5 }}>
              {LEVEL1_TIPS.map((tip) => (
                <li key={tip} style={{ listStyle: 'none', display: 'flex', gap: 8 }}>
                  <span style={{ color: C.amber }}>•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section style={{ background: C.surface, border: `1px solid ${C.green}50`, borderRadius: 16, padding: '22px 20px' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.green, marginBottom: 8 }}>Próximo paso sugerido</p>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: C.textMuted, marginBottom: 12 }}>{actionPlan.intro}</p>

          <div style={{ position: 'relative', borderRadius: 10, border: `1px solid ${C.border}`, background: '#1A2B2E', padding: '14px 14px', marginBottom: 12 }}>
            <CopyButton text={actionPlan.prompt} />
            <p style={{ color: '#CBCBD0', fontSize: 12.5, lineHeight: 1.6, paddingRight: 78, whiteSpace: 'pre-wrap' }}>{actionPlan.prompt}</p>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 42,
                borderRadius: 10,
                border: `1px solid ${C.cyan}`,
                color: C.cyan,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 13,
                padding: '8px 12px',
              }}
            >
              Abrir recurso recomendado: {resource.label}
            </a>

            <a
              href={downloadHref}
              download
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 42,
                borderRadius: 10,
                border: `1px solid ${C.green}`,
                background: `${C.green}22`,
                color: C.text,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 13,
                padding: '8px 12px',
              }}
            >
              Descargar guía personalizada en PDF
            </a>
          </div>
        </section>

        <p style={{ textAlign: 'center', fontSize: 11, color: C.textDim, marginTop: 26, letterSpacing: '0.03em' }}>
          BCR · Diagnostico Pulse IA · Uso interno
        </p>
      </div>
    </main>
  )
}
