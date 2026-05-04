'use client'

import { useMemo, useState } from 'react'
import { deleteParticipant, exportParticipantsCsv } from '@/actions/admin'
import type { ParticipantAdminRow } from '@/actions/admin'

export default function ParticipantsTable({ initialRows }: { initialRows: ParticipantAdminRow[] }) {
  const [rows, setRows] = useState(initialRows)
  const [loadingExport, setLoadingExport] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sortedRows = useMemo(() => rows, [rows])

  async function handleExport() {
    setLoadingExport(true)
    try {
      const csv = await exportParticipantsCsv()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'participantes-pulso-ia.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setLoadingExport(false)
    }
  }

  async function handleDelete(row: ParticipantAdminRow) {
    const ok = window.confirm(`¿Seguro que querés borrar a ${row.full_name}? Esta acción elimina también respuestas y sesiones.`)
    if (!ok) return

    setDeletingId(row.id)
    try {
      const res = await deleteParticipant(row.id)
      if (!res.success) {
        alert(res.error || 'No se pudo borrar el participante')
        return
      }
      setRows((prev) => prev.filter((p) => p.id !== row.id))
    } finally {
      setDeletingId(null)
    }
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link)
  }

  if (sortedRows.length === 0) {
    return (
      <div
        className="rounded-2xl p-10 text-center"
        style={{ background: '#1E293B', border: '1px solid #334155' }}
      >
        <p className="text-sm" style={{ color: '#64748B' }}>
          Todavía no hay participantes importados.
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid #334155' }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ background: '#1E293B', borderBottom: '1px solid #334155' }}>
        <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#64748B' }}>
          Listado de participantes y links
        </p>
        <button
          onClick={handleExport}
          disabled={loadingExport}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{
            background: '#3B82F6',
            color: '#fff',
            opacity: loadingExport ? 0.7 : 1,
          }}
        >
          {loadingExport ? 'Preparando...' : 'Descargar en Excel (.csv)'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#1E293B', borderBottom: '1px solid #334155' }}>
              {['Nombre', 'Email', 'Area', 'Cargo', 'Link', 'Estado', 'Acciones'].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold tracking-wider uppercase"
                  style={{ color: '#475569' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r, i) => (
              <tr
                key={r.id}
                style={{
                  background: i % 2 === 0 ? '#0F172A' : '#111827',
                  borderBottom: '1px solid #1E293B',
                }}
              >
                <td className="px-4 py-3" style={{ color: '#F8FAFC' }}>{r.full_name}</td>
                <td className="px-4 py-3" style={{ color: '#94A3B8' }}>{r.corporate_email}</td>
                <td className="px-4 py-3" style={{ color: '#94A3B8' }}>{r.area || '—'}</td>
                <td className="px-4 py-3" style={{ color: '#94A3B8' }}>{r.role || '—'}</td>
                <td className="px-4 py-3" style={{ color: '#60A5FA' }}>
                  <a href={r.link} target="_blank" rel="noreferrer" className="underline">
                    Abrir link
                  </a>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      background: r.status_label === 'Concluida / PDF listo' ? '#10B98122' : '#64748B22',
                      color: r.status_label === 'Concluida / PDF listo' ? '#10B981' : '#94A3B8',
                    }}
                  >
                    {r.status_label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyLink(r.link)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: '#1E293B', color: '#94A3B8', border: '1px solid #334155' }}
                    >
                      Copiar
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      disabled={deletingId === r.id}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{
                        background: '#7F1D1D',
                        color: '#FECACA',
                        border: '1px solid #991B1B',
                        opacity: deletingId === r.id ? 0.6 : 1,
                      }}
                    >
                      {deletingId === r.id ? 'Borrando...' : 'Borrar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
