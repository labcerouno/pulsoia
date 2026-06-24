import type { ProfileLabel } from '@/lib/supabase/types'

const CONCRETE_HINTS = [
  'ventas',
  'cliente',
  'reporte',
  'informe',
  'excel',
  'analisis',
  'resumen',
  'cotizacion',
  'presupuesto',
  'email',
  'llamada',
  'reunion',
  'stock',
  'factura',
  'soporte',
  'contenido',
  'campana',
  'propuesta',
  'tablero',
  'proceso',
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

export function toSecondPerson(text: string): string {
  if (!text) return text

  return text
    .replace(/\b[Ee]l participante\b/g, 'vos')
    .replace(/\b[Ll]a participante\b/g, 'vos')
    .replace(/\b[Aa]l participante\b/g, 'a vos')
    .replace(/\b[Dd]el participante\b/g, 'tu')
    .replace(/\b[Ss]u\b/g, 'tu')
    .replace(/\b[Ss]us\b/g, 'tus')
    .replace(/\b[Ll]e conviene\b/g, 'te conviene')
    .replace(/\b[Ss]e recomienda\b/g, 'te conviene')
    .replace(/\b[Dd]ebe\b/g, 'podés')
}

function isAmbiguousOpportunity(opportunity: string | null): boolean {
  if (!opportunity) return true

  const clean = normalize(opportunity)
  if (clean.length < 24) return true

  const veryGeneric =
    clean === 'no se' ||
    clean === 'nose' ||
    clean === 'ninguna' ||
    clean === 'no aplica' ||
    clean === 'mejorar con ia' ||
    clean === 'usar ia mejor'

  if (veryGeneric) return true

  const hasHint = CONCRETE_HINTS.some((hint) => clean.includes(hint))
  const genericOnly = /^(mejorar|optimizar|automatizar|aprender|organizar|productividad|eficiencia)(\s|$)/.test(clean)

  return !hasHint && genericOnly
}

function inferExpertType(text: string): string {
  const n = normalize(text)

  if (n.includes('ventas') || n.includes('cliente') || n.includes('cotizacion')) {
    return 'experto en crecimiento comercial y operaciones de ventas'
  }
  if (n.includes('excel') || n.includes('analisis') || n.includes('tablero')) {
    return 'experto en analisis de datos y mejora operativa'
  }
  if (n.includes('reporte') || n.includes('informe') || n.includes('document')) {
    return 'experto en productividad y estandarizacion de procesos administrativos'
  }
  if (n.includes('soporte') || n.includes('ticket') || n.includes('consulta')) {
    return 'experto en experiencia de cliente y eficiencia de soporte'
  }
  return 'experto en mejora de procesos de negocio con IA aplicada'
}

function buildConcretePrompt(params: {
  opportunity: string
  area: string | null
  role: string | null
  tools: string | null
}): string {
  const expert = inferExpertType(params.opportunity)
  const area = params.area || 'completar'
  const role = params.role || 'completar'
  const tools = params.tools || 'completar'

  return `Actuá como un ${expert}. Quiero mejorar esta tarea en los próximos 30 días: "${params.opportunity}". Tomá este contexto: [tipo de empresa o rubro: ${area}], [rol: ${role}], [producto/servicio/tarea: completar], [forma actual de hacerlo / canal / proceso: completar], [tipo de cliente o área: ${area}], [principal problema: completar], [herramientas que usa: ${tools}]. Dame 5 acciones concretas para mejorar esto en 30-90 días, indicá cuáles puedo potenciar con IA, proponé un plan simple de 4 semanas y definí las métricas clave para seguimiento. Cerrá con una respuesta práctica, específica, priorizada por impacto rápido y con primeros pasos para hoy.`
}

function buildDiscoveryPrompt(params: { profile: ProfileLabel; area: string | null; role: string | null; tools: string | null }): string {
  const profile = params.profile
  const area = params.area || 'completar'
  const role = params.role || 'completar'
  const tools = params.tools || 'completar'

  return `Actuá como un experto en adopción de IA aplicada al trabajo diario. La persona tiene perfil ${profile} y trabaja como ${role} en el rubro ${area}. Usa hoy estas herramientas: ${tools}. Diseñá un plan personalizado de 30 días para pasar de ese perfil a un uso más consistente y valioso de IA. Proponé 5 tareas concretas donde pueda ahorrar tiempo, reducir errores o mejorar calidad, priorizá las 3 de mayor impacto y elegí 1 caso piloto simple para arrancar esta semana. Cerrá con pasos semanales, riesgos a evitar y métricas mínimas para seguir el avance. Respondé en formato práctico, específico y priorizado.`
}

export function buildActionPlan(input: {
  profile: ProfileLabel
  opportunity: string | null
  area: string | null
  role: string | null
  tools: string | null
  nextStep: string
}) {
  const ambiguous = isAmbiguousOpportunity(input.opportunity)

  if (ambiguous) {
    return {
      intro:
        'Tu respuesta sobre la tarea a mejorar quedó abierta. Para que avances igual hoy, copiá este prompt y usalo como punto de partida.',
      prompt: buildDiscoveryPrompt({ profile: input.profile, area: input.area, role: input.role, tools: input.tools }),
      isFallback: true,
    }
  }

  const concrete = input.opportunity?.trim() || ''

  return {
    intro: `${toSecondPerson(input.nextStep)} En base a lo que querés mejorar en 30 días, este prompt te da una guía concreta para pasar a la acción.`,
    prompt: buildConcretePrompt({ opportunity: concrete, area: input.area, role: input.role, tools: input.tools }),
    isFallback: false,
  }
}
