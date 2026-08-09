// hachamama-parenting-program/mentor-dashboard/src/app/participants/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseMentorDataSource } from '@/lib/mentor-data-source'
import { buildParticipantList } from '@/lib/mentor-view'
import { DashboardHeader } from '@/components/dashboard-header'
import { pageWrapperStyle } from '@/lib/brand'
import { ParticipantsCards } from './participants-cards'

export default async function ParticipantsPage() {
  const supabase = await createSupabaseServerClient()
  const dataSource = createSupabaseMentorDataSource(supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const participants = await buildParticipantList(dataSource, new Date())

  return (
    <>
      <DashboardHeader active="participants" />
      <main style={pageWrapperStyle}>
        <h1>נרשמים</h1>
        <ParticipantsCards initialParticipants={participants} currentMentorUserId={user?.id ?? null} />
      </main>
    </>
  )
}
