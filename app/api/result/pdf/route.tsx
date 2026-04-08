import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import { getResultByToken } from '@/actions/diagnostic'
import { ResultPDF } from '@/lib/pdf/ResultPDF'
import type { ProfileLabel } from '@/lib/supabase/types'
import type { ResultPDFData } from '@/lib/pdf/ResultPDF'
import { buildActionPlan, toSecondPerson } from '@/lib/action-plan'

const STEP_BY_LEVEL: Record<ProfileLabel, string> = {
  OBSERVADOR: 'Defini una tarea puntual de menos de 20 minutos y usá IA hoy para resolver solo esa parte. Medí tiempo antes y después.',
  EXPLORADOR: 'Elegí una tarea semanal concreta (reporte, resumen o análisis), creá un mini flujo con IA y repetilo durante 2 semanas.',
  'USUARIO ACTIVO': 'Tomá un proceso real de tu área y estandarizalo con checklist: entrada, validación y salida. Esto te sube calidad y velocidad.',
  MULTIPLICADOR: 'Armá un caso replicable de tu equipo con impacto medible (tiempo, errores, retrabajo) y compartilo en una sesión corta.',
  REFERENTE: 'Definí un plan de adopción por frente (operación, análisis, comunicación) y asigná un responsable por frente con objetivo semanal.',
}

function pickResource(response: {
  q3_use_cases: string[] | null
  q5_barrier: string | null
  q5_barrier_other: string | null
}): { label: string; url: string } {
  const useCases = response.q3_use_cases ?? []
  const barrier = (response.q5_barrier_other || response.q5_barrier || '').toLowerCase()

  if (barrier.includes('seguridad') || barrier.includes('confidencial')) {
    return { label: 'Guía de buenas prácticas de seguridad para IA', url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/' }
  }
  if (useCases.some((u) => u.toLowerCase().includes('excel') || u.toLowerCase().includes('análisis'))) {
    return { label: 'Guía práctica para análisis de datos con IA', url: 'https://platform.openai.com/docs/guides/data-analysis' }
  }
  if (useCases.some((u) => u.toLowerCase().includes('transcribir') || u.toLowerCase().includes('llamada'))) {
    return { label: 'Guía de transcripción y resumen de reuniones', url: 'https://platform.openai.com/docs/guides/speech-to-text' }
  }
  if (useCases.some((u) => u.toLowerCase().includes('informe') || u.toLowerCase().includes('texto'))) {
    return { label: 'Guía de redacción profesional asistida por IA', url: 'https://platform.openai.com/docs/guides/text?api-mode=chat' }
  }
  return { label: 'Guía base de trabajo con IA para productividad', url: 'https://platform.openai.com/docs/guides/prompt-engineering' }
}

const STRENGTH_FALLBACK: Record<ProfileLabel, string> = {
  OBSERVADOR: 'Estás en una etapa inicial. Con pasos chicos y consistentes vas a notar avances rápido.',
  EXPLORADOR: 'Buen avance: ya estás probando IA en tu trabajo.',
  'USUARIO ACTIVO': 'Excelente ritmo: ya convertiste IA en una herramienta de trabajo.',
  MULTIPLICADOR: 'Gran nivel: ya estás generando impacto y podés impulsar a otros.',
  REFERENTE: 'Nivel sobresaliente: tu experiencia puede acelerar a todo el equipo.',
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t')?.trim()
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  const data = await getResultByToken(token)

  if (!data.found || !data.participant || !data.response) {
    return NextResponse.json({ error: 'Resultado no encontrado' }, { status: 404 })
  }

  const { participant, response } = data
  const profile = (response.profile_label as ProfileLabel) ?? 'OBSERVADOR'
  const resource = pickResource(response)
  const nextStep = toSecondPerson(response.next_step_recommendation || STEP_BY_LEVEL[profile])
  const actionPlan = buildActionPlan({
    profile,
    opportunity: response.q6_opportunity_raw,
    area: participant.area,
    role: participant.role,
    tools: response.q1_tools_used,
    nextStep,
  })

  const pdfData: ResultPDFData = {
    name: participant.full_name,
    area: participant.area,
    profile,
    score: response.score_total ?? 0,
    strength: toSecondPerson(response.strength_summary || STRENGTH_FALLBACK[profile]),
    actionIntro: actionPlan.intro,
    actionPrompt: actionPlan.prompt,
    opportunity: response.q6_opportunity_raw,
    useCases: response.q3_use_cases,
    tools: response.q1_tools_used,
    resourceLabel: resource.label,
    resourceUrl: resource.url,
  }

  const element = createElement(ResultPDF, { d: pdfData })
  const buffer = await renderToBuffer(element as ReactElement<DocumentProps>)

  const filename = `pulse-ia-bcr-${participant.full_name.toLowerCase().replace(/\s+/g, '-')}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
