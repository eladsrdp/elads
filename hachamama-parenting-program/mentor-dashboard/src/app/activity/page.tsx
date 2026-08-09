// hachamama-parenting-program/mentor-dashboard/src/app/activity/page.tsx
// חלונית פעילות נפרדת מ-/participants — לפי בקשת המשתמש (2026-08-09): הטבלה חוזרת
// למקומה ב-/participants, וגריד הכרטיסים (רצף אי-לחיצה/סטטוס-היום/סרטונים/משלוחים)
// עומד בפני עצמו כאן, לא מחליף אותה.
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseMentorDataSource } from '@/lib/mentor-data-source'
import { buildParticipantList } from '@/lib/mentor-view'
import { DashboardHeader } from '@/components/dashboard-header'
import { pageWrapperStyle } from '@/lib/brand'
import { ParticipantsCards } from '@/app/participants/participants-cards'

export default async function ActivityPage() {
  const supabase = await createSupabaseServerClient()
  const dataSource = createSupabaseMentorDataSource(supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const participants = await buildParticipantList(dataSource, new Date())

  return (
    <>
      <DashboardHeader active="activity" />
      <main style={pageWrapperStyle}>
        <h1>פעילות</h1>
        <ParticipantsCards initialParticipants={participants} currentMentorUserId={user?.id ?? null} />
      </main>
    </>
  )
}
