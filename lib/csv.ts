import { parse } from 'csv-parse/sync'

export interface CsvParticipantRow {
  full_name: string
  corporate_email: string
  area?: string
  management_unit?: string
  role?: string
}

export function parseCsvParticipants(csvContent: string): CsvParticipantRow[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[]

  return records.map((row, i) => {
    // Support multiple possible column name variants
    const full_name =
      row['full_name'] || row['nombre'] || row['name'] || row['nombre_completo'] || ''
    const corporate_email =
      row['corporate_email'] || row['email'] || row['correo'] || row['mail'] || ''

    if (!full_name || !corporate_email) {
      throw new Error(
        `Fila ${i + 2}: faltan campos obligatorios (full_name/nombre y corporate_email/email)`
      )
    }

    return {
      full_name: full_name.trim(),
      corporate_email: corporate_email.trim().toLowerCase(),
      area: row['area']?.trim() || undefined,
      management_unit: (row['management_unit'] || row['gerencia'])?.trim() || undefined,
      role: (row['role'] || row['cargo'] || row['puesto'])?.trim() || undefined,
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
