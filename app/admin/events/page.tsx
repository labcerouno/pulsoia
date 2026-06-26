'use client'

import { useEffect, useMemo, useState } from 'react'
import { createEvent, getAdminEvents, updateEventStatus } from '@/actions/admin'
import type { AdminEvent } from '@/actions/admin'

type EventStatus = 'draft' | 'active' | 'closed'

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Draft',
  active: 'Activo',
  closed: 'Cerrado',
}

const STATUS_COLORS: Record<EventStatus, { bg: string; fg: string; border: string }> = {
  draft: { bg: '#33415533', fg: '#94A3B8', border: '#334155' },
  active: { bg: '#065F4633', fg: '#34D399', border: '#065F46' },
  closed: { bg: '#7F1D1D33', fg: '#FCA5A5', border: '#991B1B' },
}

export default function EventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusLoadingById, setStatusLoadingById] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [status, setStatus] = useState<EventStatus>('draft')

  const webhookUrl = useMemo(() => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${baseUrl}/api/integrations/google-forms`
  }, [])

  async function loadEvents() {
    setLoading(true)
    setError(null)
    try {
      const rows = await getAdminEvents()
      setEvents(rows)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEvents()
  }, [])

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('slug', slug || slugify(name))
      formData.append('description', description)
      formData.append('starts_at', startsAt)
      formData.append('status', status)

      const result = await createEvent(formData)
      if (!result.success) {
        setError(result.error || 'No se pudo crear el evento')
        return
      }

      setName('')
      setSlug('')
      setDescription('')
      setStartsAt('')
      setStatus('draft')
      await loadEvents()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStatusChange(eventId: string, newStatus: EventStatus) {
    setStatusLoadingById((current) => ({ ...current, [eventId]: true }))
    setError(null)
    try {
      const result = await updateEventStatus(eventId, newStatus)
      if (!result.success) {
        setError(result.error || 'No se pudo actualizar estado')
        return
      }

      setEvents((current) =>
        current.map((event) => (event.id === eventId ? { ...event, status: newStatus } : event))
      )
    } finally {
      setStatusLoadingById((current) => ({ ...current, [eventId]: false }))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="text-xl font-semibold" style={{ color: '#F8FAFC' }}>
          Eventos
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 mb-8">
        <div className="rounded-2xl p-6" style={{ background: '#1E293B', border: '1px solid #334155' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#94A3B8' }}>
            Crear evento
          </h2>

          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <label className="block text-xs mb-2" style={{ color: '#94A3B8' }}>
                Nombre
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: '#0F172A', border: '1px solid #334155', color: '#F8FAFC' }}
                placeholder="Ej: Demo Junio 2026"
              />
            </div>

            <div>
              <label className="block text-xs mb-2" style={{ color: '#94A3B8' }}>
                Slug
              </label>
              <input
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: '#0F172A', border: '1px solid #334155', color: '#F8FAFC' }}
                placeholder="demo-junio-2026"
              />
            </div>

            <div>
              <label className="block text-xs mb-2" style={{ color: '#94A3B8' }}>
                Descripción (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none min-h-24"
                style={{ background: '#0F172A', border: '1px solid #334155', color: '#F8FAFC' }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-2" style={{ color: '#94A3B8' }}>
                  Inicio (opcional)
                </label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: '#0F172A', border: '1px solid #334155', color: '#F8FAFC' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-2" style={{ color: '#94A3B8' }}>
                  Estado inicial
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EventStatus)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: '#0F172A', border: '1px solid #334155', color: '#F8FAFC' }}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Activo</option>
                  <option value="closed">Cerrado</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: '#3B82F6', color: '#fff', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Creando...' : 'Crear evento'}
            </button>
          </form>
        </div>

        <div className="rounded-2xl p-6" style={{ background: '#1E293B', border: '1px solid #334155' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#94A3B8' }}>
            Integración Google Forms
          </h2>

          <div className="space-y-3 text-sm" style={{ color: '#CBD5E1' }}>
            <p>
              Endpoint webhook:
            </p>
            <code className="block p-3 rounded-lg text-xs break-all" style={{ background: '#0F172A', color: '#93C5FD' }}>
              {webhookUrl}
            </code>

            <p>Header requerido:</p>
            <code className="block p-3 rounded-lg text-xs" style={{ background: '#0F172A', color: '#93C5FD' }}>
              x-pulso-forms-secret: GOOGLE_FORMS_WEBHOOK_SECRET
            </code>

            <p className="text-xs" style={{ color: '#94A3B8' }}>
              El webhook solo procesa eventos en estado activo.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 mb-4" style={{ background: '#7F1D1D33', border: '1px solid #991B1B', color: '#FCA5A5' }}>
          {error}
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #334155' }}>
        <div className="px-6 py-4" style={{ background: '#1E293B', borderBottom: '1px solid #334155' }}>
          <p className="text-sm font-semibold" style={{ color: '#94A3B8' }}>
            Eventos registrados
          </p>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-sm" style={{ color: '#64748B', background: '#0F172A' }}>
            Cargando eventos...
          </div>
        ) : events.length === 0 ? (
          <div className="px-6 py-8 text-sm" style={{ color: '#64748B', background: '#0F172A' }}>
            No hay eventos cargados todavía.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#1E293B', borderBottom: '1px solid #334155' }}>
                  {['Nombre', 'Slug', 'Estado', 'Inicio', 'Acciones'].map((header) => (
                    <th key={header} className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: '#64748B' }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((event, index) => (
                  <tr
                    key={event.id}
                    style={{
                      background: index % 2 === 0 ? '#0F172A' : '#111827',
                      borderBottom: '1px solid #1E293B',
                    }}
                  >
                    <td className="px-4 py-3" style={{ color: '#F8FAFC' }}>
                      {event.name}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#93C5FD' }}>
                      {event.slug}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: STATUS_COLORS[event.status].bg,
                          color: STATUS_COLORS[event.status].fg,
                          border: `1px solid ${STATUS_COLORS[event.status].border}`,
                        }}
                      >
                        {STATUS_LABELS[event.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#94A3B8' }}>
                      {event.starts_at
                        ? new Date(event.starts_at).toLocaleString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(['draft', 'active', 'closed'] as EventStatus[]).map((nextStatus) => (
                          <button
                            key={nextStatus}
                            onClick={() => handleStatusChange(event.id, nextStatus)}
                            disabled={statusLoadingById[event.id] || event.status === nextStatus}
                            className="text-xs px-2.5 py-1 rounded-lg"
                            style={{
                              background: event.status === nextStatus ? '#334155' : '#1E293B',
                              color: event.status === nextStatus ? '#E2E8F0' : '#94A3B8',
                              border: '1px solid #334155',
                              opacity: statusLoadingById[event.id] ? 0.6 : 1,
                            }}
                          >
                            {STATUS_LABELS[nextStatus]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}