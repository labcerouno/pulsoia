import type { ProfileLabel } from './supabase/types'

const VALUE_KEYWORDS = ['ahorré', 'mejoré', 'logré', 'reduje', 'automaticé', 'ahorr', 'mejor', 'logr', 'reduj', 'automat']
const SPECIFIC_TOOLS = ['chatgpt', 'claude', 'gemini', 'copilot', 'gpt-4', 'gpt4', 'midjourney', 'dall-e', 'dalle', 'perplexity', 'bing', 'bard', 'whisper', 'notion ai', 'grammarly', 'jasper', 'runway', 'synthesia', 'gamma', 'beautiful.ai']

export interface ScoreResult {
  score_usage: number
  score_integration: number
  score_value_signal: number
  score_opportunity_clarity: number
  score_total: number
  profile_label: ProfileLabel
}

export function scoreUsage(q1_usage: boolean | null, q1_tools_used: string | null): number {
  if (!q1_usage) return 0

  if (!q1_tools_used || q1_tools_used.trim().length === 0) return 1

  const toolsLower = q1_tools_used.toLowerCase()
  const mentionsSpecific = SPECIFIC_TOOLS.some(t => toolsLower.includes(t))
  if (mentionsSpecific) return 3

  // Generic mention (has text but no specific tools)
  return 2
}

export function scoreIntegration(q2_integration: string | null): number {
  if (!q2_integration) return 0

  if (q2_integration === 'La uso todos los dias') return 3
  if (q2_integration === 'La uso de vez en cuando') return 2
  if (q2_integration === 'La uso de forma bastante habitual') return 3
  if (q2_integration === 'La uso de vez en cuando para tareas puntuales') return 2
  if (q2_integration === 'La probé, pero todavía no forma parte de mi rutina') return 1
  if (q2_integration === 'Aún no encontré una forma clara de aplicarla') return 0

  return 0
}

export function scoreValueSignal(q4_success_case_raw: string | null, q4_followup_raw: string | null): number {
  if (!q4_success_case_raw || q4_success_case_raw.trim().length === 0) return 0

  const combined = [q4_success_case_raw, q4_followup_raw].filter(Boolean).join(' ').toLowerCase()
  const hasKeywords = VALUE_KEYWORDS.some(kw => combined.includes(kw))
  const isLong = combined.length > 80

  if (hasKeywords && isLong) return 3
  if (isLong) return 2
  if (combined.trim().length > 0) return 1

  return 0
}

export function scoreOpportunityClarity(q6_opportunity_raw: string | null, q6_followup_raw: string | null): number {
  if (!q6_opportunity_raw || q6_opportunity_raw.trim().length === 0) return 0

  const combined = [q6_opportunity_raw, q6_followup_raw].filter(Boolean).join(' ')
  const length = combined.trim().length

  if (length === 0) return 0

  // Check for specificity signals: mentions a task/tool + impact + why
  const lc = combined.toLowerCase()
  const hasImpact = ['para', 'porque', 'ahorro', 'reduci', 'mejor', 'efici', 'autom', 'tiempo', 'rápido'].some(w => lc.includes(w))
  const hasConcreteness = length > 120

  if (hasConcreteness && hasImpact) return 3
  if (length > 60) return 2
  if (length > 0) return 1

  return 0
}

export function getProfileLabel(total: number): ProfileLabel {
  if (total <= 2) return 'OBSERVADOR'
  if (total <= 5) return 'EXPLORADOR'
  if (total <= 8) return 'USUARIO ACTIVO'
  if (total <= 10) return 'MULTIPLICADOR'
  return 'REFERENTE'
}

export interface ResponseData {
  q1_usage: boolean | null
  q1_tools_used: string | null
  q2_integration: string | null
  q4_success_case_raw: string | null
  q4_followup_raw: string | null
  q6_opportunity_raw: string | null
  q6_followup_raw: string | null
}

export function computeScores(data: ResponseData): ScoreResult {
  const score_usage = scoreUsage(data.q1_usage, data.q1_tools_used)
  const score_integration = scoreIntegration(data.q2_integration)
  const score_value_signal = scoreValueSignal(data.q4_success_case_raw, data.q4_followup_raw)
  const score_opportunity_clarity = scoreOpportunityClarity(data.q6_opportunity_raw, data.q6_followup_raw)
  const score_total = score_usage + score_integration + score_value_signal + score_opportunity_clarity
  const profile_label = getProfileLabel(score_total)

  return {
    score_usage,
    score_integration,
    score_value_signal,
    score_opportunity_clarity,
    score_total,
    profile_label,
  }
}
