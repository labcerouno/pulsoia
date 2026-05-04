import { getResults, exportResultsCsv } from '@/actions/admin'

export const dynamic = 'force-dynamic'
import ExportButton from './ExportButton'

const PROFILE_COLORS: Record<string, string> = {
  OBSERVADOR: '#64748B',
  EXPLORADOR: '#3B82F6',
  'USUARIO ACTIVO': '#10B981',
  MULTIPLICADOR: '#F59E0B',
  REFERENTE: '#8B5CF6',
}

export default async function ResultsPage() {
  const results = await getResults()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold" style={{ color: '#F8FAFC' }}>
          Resultados
        </h1>
        <ExportButton />
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#1E293B', borderBottom: '1px solid #334155' }}>
                  {['Nombre', 'Area', 'Perfil', 'Completado'].map(h => (
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
                {results.map((r, i) => {
                  const profileColor = r.profile_label ? PROFILE_COLORS[r.profile_label] ?? '#64748B' : '#64748B'
                  return (
                    <tr
                      key={r.id}
                      style={{
                        background: i % 2 === 0 ? '#0F172A' : '#111827',
                        borderBottom: '1px solid #1E293B',
                      }}
                    >
                      <td className="px-4 py-3">
                        <div style={{ color: '#F8FAFC' }}>{r.full_name}</div>
                        <div className="text-xs" style={{ color: '#475569' }}>{r.corporate_email}</div>
                      </td>
                      <td className="px-4 py-3" style={{ color: '#94A3B8' }}>
                        {r.area || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {r.profile_label ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              background: `${profileColor}20`,
                              color: profileColor,
                            }}
                          >
                            {r.profile_label}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#64748B' }}>
                        {r.completed_at
                          ? new Date(r.completed_at).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
