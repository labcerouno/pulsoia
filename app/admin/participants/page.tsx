import { getParticipantsAdmin } from '@/actions/admin'
import ParticipantsTable from './participants-table'

export const dynamic = 'force-dynamic'

export default async function ParticipantsPage() {
  const participants = await getParticipantsAdmin()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold" style={{ color: '#F8FAFC' }}>
          Participantes
        </h1>
      </div>

      <ParticipantsTable initialRows={participants} />
    </div>
  )
}
