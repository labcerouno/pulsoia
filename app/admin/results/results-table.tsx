'use client'

import { Fragment, useState } from 'react'
import type { ResultRow } from '@/actions/admin'
import { RESULT_DETAIL_COLUMNS, formatResultDetailValue } from '@/lib/results-columns'

const PROFILE_COLORS: Record<string, string> = {
  OBSERVADOR: '#64748B',
  EXPLORADOR: '#3B82F6',
  'USUARIO ACTIVO': '#10B981',
  MULTIPLICADOR: '#F59E0B',
  REFERENTE: '#8B5CF6',
}

const EXPANDED_DETAIL_KEYS: Array<keyof ResultRow> = [
  'q1_tools_used',
  'q2_integration',
  'q3_use_cases',
  'q3_use_cases_other',
  'q4_success_case_raw',
  'q4_followup_raw',
  'q5_barrier',
  'q5_barrier_other',
  'q6_opportunity_raw',
  'q6_followup_raw',
]

const EXPANDED_DETAIL_COLUMNS = RESULT_DETAIL_COLUMNS.filter((column) =>
  EXPANDED_DETAIL_KEYS.includes(column.key)
)

interface ResultsTableProps {
  results: ResultRow[]
}

export default function ResultsTable({ results }: ResultsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  function toggleRow(resultId: string) {
    setExpandedRows((current) => ({
      ...current,
      [resultId]: !current[resultId],
    }))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#1E293B', borderBottom: '1px solid #334155' }}>
            {['Evento', 'Empresa', 'Nombre', 'Area', 'Perfil', 'Completado', 'Ver más'].map((header) => (
              <th
                key={header}
                className="text-left px-4 py-3 text-xs font-semibold leading-snug align-top"
                style={{ color: '#475569' }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => {
            const isExpanded = expandedRows[result.id] ?? false
            const profileColor = result.profile_label ? PROFILE_COLORS[result.profile_label] ?? '#64748B' : '#64748B'
            const rowBackground = index % 2 === 0 ? '#0F172A' : '#111827'

            return (
              <Fragment key={result.id}>
                <tr
                  style={{
                    background: rowBackground,
                    borderBottom: isExpanded ? 'none' : '1px solid #1E293B',
                  }}
                >
                  <td className="px-4 py-3" style={{ color: '#CBD5E1' }}>
                    {result.event_name || '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: '#CBD5E1' }}>
                    {result.company || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div style={{ color: '#F8FAFC' }}>{result.full_name}</div>
                    <div className="text-xs" style={{ color: '#475569' }}>
                      {result.corporate_email}
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: '#94A3B8' }}>
                    {result.area || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {result.profile_label ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: `${profileColor}20`,
                          color: profileColor,
                        }}
                      >
                        {result.profile_label}
                      </span>
                    ) : (
                      <span style={{ color: '#94A3B8' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#64748B' }}>
                    {result.completed_at
                      ? new Date(result.completed_at).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleRow(result.id)}
                      aria-expanded={isExpanded}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: '#1E293B',
                        color: '#CBD5E1',
                        border: '1px solid #334155',
                      }}
                    >
                      {isExpanded ? 'Ocultar' : 'Ver más'}
                    </button>
                  </td>
                </tr>
                {isExpanded ? (
                  <tr
                    style={{
                      background: rowBackground,
                      borderBottom: '1px solid #1E293B',
                    }}
                  >
                    <td colSpan={7} className="px-4 pb-4">
                      <div
                        className="rounded-xl px-4 py-4"
                        style={{ background: '#111827', border: '1px solid #1E293B' }}
                      >
                        <div className="grid gap-4">
                          {EXPANDED_DETAIL_COLUMNS.map((column) => (
                            <div
                              key={column.key}
                              className="grid gap-2 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:items-start"
                            >
                              <div className="text-xs font-semibold leading-relaxed" style={{ color: '#94A3B8' }}>
                                {column.label}
                              </div>
                              <div className="text-sm whitespace-pre-wrap break-words" style={{ color: '#E2E8F0' }}>
                                {formatResultDetailValue(result[column.key], '—')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}