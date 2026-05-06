import { parse } from 'csv-parse/sync'

export interface CsvParticipantRow {
  full_name: string
  corporate_email: string
  area?: string
  management_unit?: string
  role?: string
}

function normalizeHeaderName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function getValueByAliases(row: Record<string, string>, aliases: string[]): string {
  const normalizedAliasSet = new Set(aliases.map(normalizeHeaderName))

  for (const [key, value] of Object.entries(row)) {
    if (normalizedAliasSet.has(normalizeHeaderName(key))) {
      return value || ''
    }
  }

  return ''
}

export function parseCsvParticipants(csvContent: string): CsvParticipantRow[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[]

  return records.map((row, i) => {
    // Support header aliases regardless of order/case/accents/separators.
    const full_name = getValueByAliases(row, ['full_name', 'nombre', 'name', 'nombre_completo'])
    const corporate_email = getValueByAliases(row, ['corporate_email', 'email', 'correo', 'mail'])

    if (!full_name || !corporate_email) {
      throw new Error(
        `Fila ${i + 2}: faltan campos obligatorios (full_name/nombre y corporate_email/email)`
      )
    }

    return {
      full_name: full_name.trim(),
      corporate_email: corporate_email.trim().toLowerCase(),
      area: getValueByAliases(row, ['area']).trim() || undefined,
      management_unit: getValueByAliases(row, ['management_unit', 'gerencia']).trim() || undefined,
      role: getValueByAliases(row, ['role', 'cargo', 'puesto']).trim() || undefined,
    }
  })
}

export function buildResultsCsv(
  results: Array<{
    full_name: string
    corporate_email: string
    area: string | null
    management_unit: string | null
    role: string | null
    completed_at: string | null
    score_total: number | null
    profile_label: string | null
    score_usage: number | null
    score_integration: number | null
    score_value_signal: number | null
    score_opportunity_clarity: number | null
    q5_barrier: string | null
    has_success_case: boolean
    next_step_recommendation: string | null
  }>
): string {
  const headers = [
    'Nombre',
    'Email',
    'Area',
    'Gerencia',
    'Cargo',
    'Completado',
    'Score Total',
    'Perfil',
    'Score Uso',
    'Score Integración',
    'Score Valor',
    'Score Oportunidad',
    'Barrera Principal',
    'Tiene Caso de Exito',
    'Próximo Paso',
  ]

  const escape = (v: string | null | undefined | boolean | number) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const rows = results.map(r => [
    escape(r.full_name),
    escape(r.corporate_email),
    escape(r.area),
    escape(r.management_unit),
    escape(r.role),
    escape(r.completed_at ? new Date(r.completed_at).toLocaleString('es-AR') : ''),
    escape(r.score_total),
    escape(r.profile_label),
    escape(r.score_usage),
    escape(r.score_integration),
    escape(r.score_value_signal),
    escape(r.score_opportunity_clarity),
    escape(r.q5_barrier),
    escape(r.has_success_case ? 'Sí' : 'No'),
    escape(r.next_step_recommendation),
  ])

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
}

export function buildParticipantsCsv(
  rows: Array<{
    full_name: string
    corporate_email: string
    area: string | null
    management_unit: string | null
    role: string | null
    link: string
    status: string
  }>
): string {
  const headers = ['Nombre', 'Email', 'Area', 'Gerencia', 'Cargo', 'Link', 'Estado']

  const escape = (v: string | null | undefined | boolean | number) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const data = rows.map((r) => [
    escape(r.full_name),
    escape(r.corporate_email),
    escape(r.area),
    escape(r.management_unit),
    escape(r.role),
    escape(r.link),
    escape(r.status),
  ])

  return [headers.join(','), ...data.map((r) => r.join(','))].join('\n')
}
