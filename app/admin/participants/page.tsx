import { getCompanyOptions, getParticipantsAdmin } from '@/actions/admin'
import ParticipantsTable from './participants-table'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ company?: string }>
}

export default async function ParticipantsPage({ searchParams }: Props) {
  const params = await searchParams
  const company = params.company?.trim() || ''
  const [participants, companies] = await Promise.all([
    getParticipantsAdmin(company || undefined),
    getCompanyOptions(),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold" style={{ color: '#F8FAFC' }}>
          Participantes
        </h1>
        <form method="get" className="flex items-center gap-2">
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
      </div>

      <ParticipantsTable initialRows={participants} company={company || undefined} />
    </div>
  )
}
