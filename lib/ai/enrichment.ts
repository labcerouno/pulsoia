import type { ProfileLabel } from '../supabase/types'

export interface EnrichmentInput {
  q1_usage: boolean | null
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
  profile_label: ProfileLabel
  score_total: number
}

export interface EnrichmentResult {
  ai_summary: string
  barrier_tags: string[]
  opportunity_tags: string[]
  has_success_case: boolean
  success_case_summary: string
  strength_summary: string
  next_step_recommendation: string
  provider_used: 'openai' | 'anthropic' | 'fallback'
}

// -------------------------------------------------------------------
// Provider priority order — change this constant to reorder providers.
// Can also be overridden with env var ENRICHMENT_PROVIDER_ORDER=openai,claude
// -------------------------------------------------------------------
const DEFAULT_PROVIDER_ORDER: ProviderName[] = ['openai', 'claude']

type ProviderName = 'claude' | 'openai'

// Timeout per provider attempt (ms)
const PROVIDER_TIMEOUT_MS = 12_000

// -------------------------------------------------------------------
// Fallback texts per profile (used when ALL providers fail)
// -------------------------------------------------------------------
const FALLBACK_TEXTS: Record<
  ProfileLabel,
  Pick<EnrichmentResult, 'strength_summary' | 'next_step_recommendation'>
> = {
  OBSERVADOR: {
    strength_summary:
      'Ya identificaste las barreras concretas que hoy te frenan para adoptar IA. Ese primer paso es clave.',
    next_step_recommendation:
      'Elegí una sola herramienta (ChatGPT o similar) y probala 15 minutos esta semana en una tarea que hoy hacés de forma manual.',
  },
  EXPLORADOR: {
    strength_summary:
      'Ya probaste herramientas de IA y tenés una idea clara de dónde te pueden ayudar.',
    next_step_recommendation:
      'Definí un uso concreto y repetilo durante 2 semanas seguidas para transformarlo en hábito.',
  },
  'USUARIO ACTIVO': {
    strength_summary:
      'Ya encontraste usos reales y los aplicás en tu trabajo cotidiano. Eso te diferencia en adopción.',
    next_step_recommendation:
      'Documentá uno de tus casos de uso con resultado concreto y compartilo con al menos una persona de tu equipo.',
  },
  MULTIPLICADOR: {
    strength_summary:
      'Integrás IA de forma habitual y ya podés mostrar valor concreto en tu trabajo.',
    next_step_recommendation:
      'Organizá una sesión corta de 30 minutos con tu equipo para mostrar un caso real que te funcionó.',
  },
  REFERENTE: {
    strength_summary:
      'Tu uso de IA ya es avanzado y con impacto claro. Podés acelerar la adopción del equipo.',
    next_step_recommendation:
      'Proponé facilitar el próximo taller interno de IA y compartí una metodología replicable de tu experiencia.',
  },
}

function buildFallback(profile: ProfileLabel, input: EnrichmentInput): EnrichmentResult {
  const fb = FALLBACK_TEXTS[profile]
  const barrier = input.q5_barrier ?? input.q5_barrier_other ?? null
  const hasCase = !!(input.q4_success_case_raw && input.q4_success_case_raw.trim().length > 20)

  return {
    ai_summary: `Perfil: ${profile}. Puntaje total: ${input.score_total}/12.`,
    barrier_tags: barrier ? [barrier] : [],
    opportunity_tags: input.q6_opportunity_raw ? ['Oportunidad identificada'] : [],
    has_success_case: hasCase,
    success_case_summary: hasCase ? (input.q4_success_case_raw ?? '') : '',
    strength_summary: fb.strength_summary,
    next_step_recommendation: fb.next_step_recommendation,
    provider_used: 'fallback',
  }
}

// -------------------------------------------------------------------
// Shared prompt (same regardless of provider)
// -------------------------------------------------------------------
function buildPrompt(input: EnrichmentInput): string {
  return `Sos un analista experto en adopción de IA en organizaciones. Analizá las respuestas de este participante al diagnóstico institucional de IA.

DATOS DEL PARTICIPANTE:
- Usó IA en las últimas 2 semanas: ${input.q1_usage ? 'Sí' : 'No'}
- Herramientas usadas: ${input.q1_tools_used || 'No especificó'}
- Nivel de integración: ${input.q2_integration || 'No respondió'}
- Tipos de tarea: ${(input.q3_use_cases || []).join(', ') || 'No especificó'}${input.q3_use_cases_other ? ` + ${input.q3_use_cases_other}` : ''}
- Caso de éxito: ${input.q4_success_case_raw || 'No proporcionó'}
- Seguimiento caso: ${input.q4_followup_raw || 'No aplica'}
- Barrera principal: ${input.q5_barrier || input.q5_barrier_other || 'No especificó'}
- Oportunidad próximos 30 días: ${input.q6_opportunity_raw || 'No proporcionó'}
- Seguimiento oportunidad: ${input.q6_followup_raw || 'No aplica'}
- Perfil calculado: ${input.profile_label} (${input.score_total}/12)

Respondé ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "ai_summary": "Resumen ejecutivo de 2-3 oraciones del perfil del participante",
  "barrier_tags": ["etiqueta1", "etiqueta2"],
  "opportunity_tags": ["etiqueta1", "etiqueta2"],
  "has_success_case": true,
  "success_case_summary": "Resumen del caso de éxito en 1 oración, o cadena vacía si no hay. Escribí en segunda persona",
  "strength_summary": "1-2 oraciones sobre fortalezas. Escribí en segunda persona (vos/tu), tono motivador y concreto",
  "next_step_recommendation": "1-2 oraciones con un próximo paso específico y accionable. Escribí en segunda persona"
}

REGLAS DE ESTILO OBLIGATORIAS:
- Hablale directamente a la persona en segunda persona (vos/tu).
- No uses "el participante", "la participante", "su experiencia" ni formulaciones de evaluación externa.
- Priorizá utilidad práctica y cercanía, sin tono institucional.`
}

function parseJsonResult(content: string): EnrichmentResult {
  // Strip markdown code fences if the model wraps the JSON
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(cleaned) as EnrichmentResult
}

// -------------------------------------------------------------------
// Provider: Claude (Anthropic) — claude-3-5-haiku-20241022 for speed
// -------------------------------------------------------------------
async function tryWithClaude(input: EnrichmentInput): Promise<EnrichmentResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS)

  try {
    const message = await client.messages.create(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        temperature: 0.3,
        messages: [{ role: 'user', content: buildPrompt(input) }],
      },
      { signal: controller.signal },
    )

    const block = message.content[0]
    if (block.type !== 'text') throw new Error('Unexpected response block type from Claude')
    return {
      ...parseJsonResult(block.text),
      provider_used: 'anthropic',
    }
  } finally {
    clearTimeout(timer)
  }
}

// -------------------------------------------------------------------
// Provider: OpenAI — gpt-4o-mini for speed + cost
// -------------------------------------------------------------------
async function tryWithOpenAI(input: EnrichmentInput): Promise<EnrichmentResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not set')

  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS)

  try {
    const completion = await client.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: buildPrompt(input) }],
        temperature: 0.3,
        max_tokens: 700,
        response_format: { type: 'json_object' },
      },
      { signal: controller.signal },
    )

    const content = completion.choices[0]?.message?.content
    if (!content) throw new Error('Empty response from OpenAI')
    return {
      ...parseJsonResult(content),
      provider_used: 'openai',
    }
  } finally {
    clearTimeout(timer)
  }
}

// -------------------------------------------------------------------
// Provider dispatch map
// -------------------------------------------------------------------
const PROVIDERS: Record<ProviderName, (input: EnrichmentInput) => Promise<EnrichmentResult>> = {
  claude: tryWithClaude,
  openai: tryWithOpenAI,
}

function resolveProviderOrder(): ProviderName[] {
  const env = process.env.ENRICHMENT_PROVIDER_ORDER
  if (!env) return DEFAULT_PROVIDER_ORDER

  const parsed = env
    .split(',')
    .map((s) => s.trim().toLowerCase() as ProviderName)
    .filter((s): s is ProviderName => s in PROVIDERS)

  return parsed.length > 0 ? parsed : DEFAULT_PROVIDER_ORDER
}

// -------------------------------------------------------------------
// Main export — tries providers in order, falls back to deterministic
// -------------------------------------------------------------------
export async function enrichResponse(input: EnrichmentInput): Promise<EnrichmentResult> {
  const order = resolveProviderOrder()

  for (const providerName of order) {
    const tryProvider = PROVIDERS[providerName]
    try {
      const result = await tryProvider(input)
      console.log(`[enrichment] Success via ${providerName}`)
      return result
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      console.warn(`[enrichment] ${providerName} failed (${reason}), trying next provider...`)
    }
  }

  console.warn('[enrichment] All providers failed, using deterministic fallback')
  return buildFallback(input.profile_label, input)
}
