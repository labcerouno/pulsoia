import { getCompanyOptions, getEventOptions, getResults } from '@/actions/admin'

export const dynamic = 'force-dynamic'
import ExportButton from './ExportButton'
import ResultsTable from './results-table'

interface Props {
  searchParams: Promise<{ company?: string; event?: string }>
}

export default async function ResultsPage({ searchParams }: Props) {
  const params = await searchParams
  const company = params.company?.trim() || ''
  const eventId = params.event?.trim() || ''
  const [results, events, companies] = await Promise.all([
    getResults(eventId || undefined, company || undefined),
    getEventOptions(),
    getCompanyOptions(eventId || undefined),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold" style={{ color: '#F8FAFC' }}>
          Resultados
        </h1>
        <div className="flex items-center gap-2">
          <form method="get" className="flex items-center gap-2">
            <select
              name="event"
              defaultValue={eventId}
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155' }}
            >
              <option value="">Todos los eventos</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
            <select
              name="company"
              defaultValue={company}
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155' }}
            >
              <option value="">Todas las empresas</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-3 py-2 rounded-lg text-sm"
              style={{ background: '#334155', color: '#CBD5E1', border: '1px solid #475569' }}
            >
              Filtrar
            </button>
          </form>
          <ExportButton eventId={eventId || undefined} company={company || undefined} />
        </div>
      </div>

      {results.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: '#1E293B', border: '1px solid #334155' }}
        >
          <p className="text-sm" style={{ color: '#64748B' }}>
            Aún no hay diagnósticos completados.
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid #334155' }}
        >
          <ResultsTable results={results} />
        </div>
      )}
    </div>
  )
}
