// hachamama-parenting-program/mentor-dashboard/src/app/participants/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseMentorDataSource } from '@/lib/mentor-data-source'
import { buildParticipantList } from '@/lib/mentor-view'
import { DashboardHeader } from '@/components/dashboard-header'
import { pageWrapperStyle } from '@/lib/brand'
import { ParticipantsTable } from './participants-table'

export default async function ParticipantsPage() {
  const supabase = await createSupabaseServerClient()
  const dataSource = createSupabaseMentorDataSource(supabase)
  const [participants, mentors] = await Promise.all([
    buildParticipantList(dataSource, new Date()),
    dataSource.listMentors(),
  ])

  return (
    <>
      <DashboardHeader active="participants" />
      <main style={pageWrapperStyle}>
        <h1>נרשמים</h1>
        <ParticipantsTable initialParticipants={participants} mentors={mentors} />
      </main>
    </>
  )
}
