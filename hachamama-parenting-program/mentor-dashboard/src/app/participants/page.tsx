import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseMentorDataSource } from '@/lib/mentor-data-source'
import { buildParticipantList } from '@/lib/mentor-view'
import { signOut } from '../login/actions'

export default async function ParticipantsPage() {
  const supabase = await createSupabaseServerClient()
  const dataSource = createSupabaseMentorDataSource(supabase)
  const participants = await buildParticipantList(dataSource, new Date())

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>נרשמים</h1>
        <form action={signOut}>
          <button type="submit">התנתקות</button>
        </form>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'right' }}>שם</th>
            <th style={{ textAlign: 'right' }}>יום בתוכנית</th>
            <th style={{ textAlign: 'right' }}>לחץ היום?</th>
            <th style={{ textAlign: 'right' }}>סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.id} style={{ borderTop: '1px solid #ddd' }}>
              <td>
                <Link href={`/participants/${p.id}`}>{p.fullName}</Link>
              </td>
              <td>{p.programDay}</td>
              <td>{p.clickedToday ? '✅' : '❌'}</td>
              <td>{p.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
