export interface ResultDetailFields {
  q1_tools_used: string | null
  q2_integration: string | null
  q3_use_cases: string[] | null
  q3_use_cases_other: string | null
  q4_success_case_raw: string | null
  q4_followup_raw: string | null
  q5_barrier: string | null
  q5_barrier_other: string | null
  q6_opportunity_raw: string | null
  q6_followup_raw: string | null
  ai_summary: string | null
  ai_tags: string[] | null
  barrier_tags: string[] | null
  opportunity_tags: string[] | null
  has_success_case: boolean
  success_case_summary: string | null
  strength_summary: string | null
  next_step_recommendation: string | null
}

export const RESULT_DETAIL_COLUMNS: Array<{ key: keyof ResultDetailFields; label: string }> = [
  {
    key: 'q1_tools_used',
    label: 'En las últimas 2 semanas, ¿usaste alguna herramienta de IA para algo relacionado con tu trabajo? / ¿Cuáles?',
  },
  {
    key: 'q2_integration',
    label: '¿Qué tan incorporada que está la IA en tu forma de trabajar?',
  },
  {
    key: 'q3_use_cases',
    label: '¿Para qué tipo de tareas la usás? Marcá una o varias.',
  },
  {
    key: 'q3_use_cases_other',
    label: '¿Para qué tipo de tareas la usás? Marcá una o varias. / Otro',
  },
  {
    key: 'q4_success_case_raw',
    label: 'Contame un ejemplo concreto donde la IA te haya ayudado a ahorrar tiempo, mejorar un resultado o pensar mejor.',
  },
  {
    key: 'q4_followup_raw',
    label: '¿Podés contarme en 1 o 2 líneas qué tarea era, qué herramienta usaste y qué cambió en el resultado?',
  },
  {
    key: 'q5_barrier',
    label: '¿Cuál es la principal barrera para usar más IA en tu trabajo?',
  },
  {
    key: 'q5_barrier_other',
    label: '¿Cuál es la principal barrera para usar más IA en tu trabajo? / Otra',
  },
  {
    key: 'q6_opportunity_raw',
    label: 'Si en los próximos 30 dias pudieras resolver mejor una sola tarea con IA, ¿cuál sería? ¿Y por qué?',
  },
  {
    key: 'q6_followup_raw',
    label: 'Sumemos una línea más: ¿qué cambio concreto te gustaría lograr?',
  },
  { key: 'ai_summary', label: 'Resumen IA' },
  { key: 'ai_tags', label: 'Tags IA' },
  { key: 'barrier_tags', label: 'Tags de barrera' },
  { key: 'opportunity_tags', label: 'Tags de oportunidad' },
  { key: 'has_success_case', label: 'Tiene caso de éxito' },
  { key: 'success_case_summary', label: 'Resumen del caso de éxito' },
  { key: 'strength_summary', label: 'Fortaleza principal' },
  { key: 'next_step_recommendation', label: 'Recomendación de próximo paso' },
]

export function formatResultDetailValue(
  value: ResultDetailFields[keyof ResultDetailFields],
  emptyValue = ''
): string {
  if (value === null || value === undefined) return emptyValue

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No'
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(' | ') : emptyValue
  }

  const normalized = String(value).trim()
  return normalized.length > 0 ? normalized : emptyValue
}