'use client'

import { useState } from 'react'
import { exportResultsCsv } from '@/actions/admin'

export default function ExportButton({ eventId, company }: { eventId?: string; company?: string }) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const csv = await exportResultsCsv(eventId, company)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pulso-ia-resultados-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
      style={{
        background: loading ? '#1E293B' : '#1E3A5F',
        color: loading ? '#475569' : '#93C5FD',
        border: '1px solid #334155',
      }}
    >
      {loading ? 'Exportando...' : 'Exportar CSV'}
    </button>
  )
}
