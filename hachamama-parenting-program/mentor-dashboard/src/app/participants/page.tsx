import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseMentorDataSource } from '@/lib/mentor-data-source'
import { buildParticipantList } from '@/lib/mentor-view'
import { signOut } from '../login/actions'
import { ParticipantsTable } from './participants-table'
import Link from 'next/link'

export default async function ParticipantsPage() {
  const supabase = await createSupabaseServerClient()
  const dataSource = createSupabaseMentorDataSource(supabase)
  const [participants, mentors] = await Promise.all([
    buildParticipantList(dataSource, new Date()),
    dataSource.listMentors(),
  ])

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>נרשמים</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/content">תכנים</Link>
          <form action={signOut}>
            <button type="submit">התנתקות</button>
          </form>
        </div>
      </div>
      <ParticipantsTable initialParticipants={participants} mentors={mentors} />
    </main>
  )
}
