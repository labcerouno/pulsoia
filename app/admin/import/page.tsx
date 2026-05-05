'use client'

import { useState, useRef } from 'react'
import { importParticipants } from '@/actions/admin'
import type { ImportResult } from '@/actions/admin'

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [company, setCompany] = useState('')

  const fileName = selectedFile?.name ?? null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const file = selectedFile
    if (!file || !company.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('company', company.trim())
      const res = await importParticipants(formData)
      setResult(res)
    } catch (err) {
      setResult({
        success: false,
        imported: 0,
        skipped: 0,
        errors: [(err as Error).message],
        participants: [],
      })
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
    setResult(null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') return
    setSelectedFile(file)
    setResult(null)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link)
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2" style={{ color: '#F8FAFC' }}>
        Importar participantes
      </h1>
      <p className="text-sm mb-8" style={{ color: '#64748B' }}>
        Subí un archivo CSV con columnas: <code className="px-1 rounded text-xs" style={{ background: '#1E293B', color: '#93C5FD' }}>full_name</code>,{' '}
        <code className="px-1 rounded text-xs" style={{ background: '#1E293B', color: '#93C5FD' }}>corporate_email</code>,{' '}
        <code className="px-1 rounded text-xs" style={{ background: '#1E293B', color: '#93C5FD' }}>area</code>,{' '}
        <code className="px-1 rounded text-xs" style={{ background: '#1E293B', color: '#93C5FD' }}>management_unit</code>,{' '}
        <code className="px-1 rounded text-xs" style={{ background: '#1E293B', color: '#93C5FD' }}>role</code>.
        También acepta columnas en español: <code className="px-1 rounded text-xs" style={{ background: '#1E293B', color: '#93C5FD' }}>nombre</code>, <code className="px-1 rounded text-xs" style={{ background: '#1E293B', color: '#93C5FD' }}>email</code>, <code className="px-1 rounded text-xs" style={{ background: '#1E293B', color: '#93C5FD' }}>area</code>, <code className="px-1 rounded text-xs" style={{ background: '#1E293B', color: '#93C5FD' }}>responde a, cargo</code>.
      </p>

      <div className="rounded-2xl p-8 mb-6" style={{ background: '#1E293B', border: '1px solid #334155' }}>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-xs font-semibold tracking-wide uppercase mb-2" style={{ color: '#94A3B8' }}>
              Empresa
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Nombre de la empresa"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: '#0F172A', border: '1px solid #334155', color: '#F8FAFC' }}
            />
          </div>

          {/* File drop zone */}
          <div
            className="flex flex-col items-center justify-center w-full h-36 rounded-xl cursor-pointer transition-all mb-6"
            style={{
              border: `2px dashed ${isDragging ? '#3B82F6' : fileName ? '#1D4ED8' : '#334155'}`,
              background: isDragging ? '#0F1F3A' : '#0F172A',
            }}
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mb-3">
              <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke={isDragging ? '#3B82F6' : '#475569'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm" style={{ color: isDragging ? '#93C5FD' : fileName ? '#F8FAFC' : '#64748B' }}>
              {isDragging ? 'Soltá el archivo aquí' : (fileName ?? 'Arrastrá un CSV o hacé clic para seleccionar')}
            </p>
            {!isDragging && !fileName && (
              <p className="text-xs mt-1" style={{ color: '#334155' }}>Solo archivos .csv</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <button
            type="submit"
            disabled={!fileName || !company.trim() || loading}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: !fileName || !company.trim() || loading ? '#1E293B' : '#3B82F6',
              color: !fileName || !company.trim() || loading ? '#475569' : '#fff',
              border: `1px solid ${!fileName || !company.trim() || loading ? '#334155' : '#3B82F6'}`,
            }}
          >
            {loading ? 'Importando...' : 'Importar participantes'}
          </button>
        </form>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: result.errors.length > 0 ? '#1A1A2E' : '#0D2818',
              border: `1px solid ${result.errors.length > 0 ? '#334155' : '#065F46'}`,
            }}
          >
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs mb-1" style={{ color: '#64748B' }}>Importados</p>
                <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{result.imported}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: '#64748B' }}>Ya existentes</p>
                <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{result.skipped}</p>
              </div>
              {result.errors.length > 0 && (
                <div>
                  <p className="text-xs mb-1" style={{ color: '#64748B' }}>Errores</p>
                  <p className="text-2xl font-bold" style={{ color: '#F87171' }}>{result.errors.length}</p>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold mb-2" style={{ color: '#F87171' }}>Errores:</p>
                <ul className="space-y-1">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-xs" style={{ color: '#94A3B8' }}>— {e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Participant links */}
          {result.participants.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #334155' }}>
              <div className="px-6 py-4" style={{ background: '#1E293B', borderBottom: '1px solid #334155' }}>
                <p className="text-sm font-semibold" style={{ color: '#94A3B8' }}>
                  Links de acceso generados
                </p>
              </div>
              <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
                {result.participants.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-6 py-4"
                    style={{ background: i % 2 === 0 ? '#0F172A' : '#111827', borderColor: '#1E293B' }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#F8FAFC' }}>{p.full_name}</p>
                      <p className="text-xs" style={{ color: '#475569' }}>{p.corporate_email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <code
                        className="text-xs px-2 py-1 rounded-lg hidden md:block"
                        style={{ background: '#1E293B', color: '#93C5FD', border: '1px solid #334155' }}
                      >
                        {p.link}
                      </code>
                      <button
                        onClick={() => copyLink(p.link)}
                        className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: '#1E293B', color: '#94A3B8', border: '1px solid #334155' }}
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
