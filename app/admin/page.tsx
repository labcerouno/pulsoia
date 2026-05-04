import { getStats } from '@/actions/admin'

export const dynamic = 'force-dynamic'

const PROFILE_ORDER = ['OBSERVADOR', 'EXPLORADOR', 'USUARIO ACTIVO', 'MULTIPLICADOR', 'REFERENTE']
const PROFILE_COLORS: Record<string, string> = {
  OBSERVADOR: '#64748B',
  EXPLORADOR: '#3B82F6',
  'USUARIO ACTIVO': '#10B981',
  MULTIPLICADOR: '#F59E0B',
  REFERENTE: '#8B5CF6',
}

export default async function AdminDashboard() {
  const stats = await getStats()

  const statCards = [
    { label: 'Invitados', value: stats.total_invited },
    { label: 'Iniciaron', value: stats.total_started },
    { label: 'Completaron', value: stats.total_completed },
    { label: 'Tasa de completitud', value: `${stats.completion_rate}%` },
  ]

  return (
    <div>
      <h1 className="text-xl font-semibold mb-8" style={{ color: '#F8FAFC' }}>
        Dashboard
      </h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {statCards.map(card => (
          <div
            key={card.label}
            className="rounded-2xl p-6"
            style={{ background: '#1E293B', border: '1px solid #334155' }}
          >
            <p className="text-xs mb-2" style={{ color: '#64748B' }}>
              {card.label}
            </p>
            <p className="text-3xl font-bold" style={{ color: '#F8FAFC' }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Profile distribution */}
      <div className="rounded-2xl p-6" style={{ background: '#1E293B', border: '1px solid #334155' }}>
        <h2 className="text-sm font-semibold mb-6" style={{ color: '#94A3B8' }}>
          Distribución de perfiles
        </h2>

        {stats.total_completed === 0 ? (
          <p className="text-sm" style={{ color: '#475569' }}>
            Aún no hay diagnósticos completados.
          </p>
        ) : (
          <div className="space-y-4">
            {PROFILE_ORDER.map(profile => {
              const count = stats.profile_distribution[profile] ?? 0
              const pct = stats.total_completed > 0 ? Math.round((count / stats.total_completed) * 100) : 0
              const color = PROFILE_COLORS[profile]
              return (
                <div key={profile}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: '#94A3B8' }}>{profile}</span>
                    <span style={{ color: '#64748B' }}>
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: '#0F172A' }}>
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ background: color, width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
