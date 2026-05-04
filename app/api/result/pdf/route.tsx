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

const STRENGTH_FALLBACK: Record<ProfileLabel, string> = {
  OBSERVADOR: 'Estás en una etapa inicial. Con pasos chicos y consistentes vas a notar avances reales.',
  EXPLORADOR: 'Ya empezaste a explorar IA en tu trabajo. El próximo paso es volver ese uso más constante.',
  'USUARIO ACTIVO': 'Ya tenés un uso sostenido en algunas tareas y podés consolidarlo en procesos concretos.',
  MULTIPLICADOR: 'Ya estás generando impacto real con IA y podés ayudar a que otras personas lo logren.',
  REFERENTE: 'Tu uso de IA ya es avanzado y podés acelerar la adopción del equipo con ejemplos prácticos.',
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
    strength: toSecondPerson(response.strength_summary || STRENGTH_FALLBACK[profile]),
    actionIntro: actionPlan.intro,
    actionPrompt: actionPlan.prompt,
    closingMessage:
      'Nos vemos en la próxima sesión en vivo del programa de capacitación de IA. Traé tus consultas así te podemos ayudar.',
  }

  const element = createElement(ResultPDF, { d: pdfData })
  const buffer = await renderToBuffer(element as ReactElement<DocumentProps>)

  const filename = `pulso-ia-${participant.full_name.toLowerCase().replace(/\s+/g, '-')}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
