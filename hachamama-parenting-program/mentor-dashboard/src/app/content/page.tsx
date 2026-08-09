// hachamama-parenting-program/mentor-dashboard/src/app/content/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseContentDataSource } from '@/lib/content-data-source'
import { groupMessagesByDay } from '@/lib/content-view'
import { DashboardHeader } from '@/components/dashboard-header'
import { pageWrapperStyle } from '@/lib/brand'
import { ContentGrid } from './content-grid'

export default async function ContentPage() {
  const supabase = await createSupabaseServerClient()
  const dataSource = createSupabaseContentDataSource(supabase)
  const [days, messages] = await Promise.all([dataSource.listAllContentDays(), dataSource.listAllMessages()])
  const initialGroups = groupMessagesByDay(days, messages)

  return (
    <>
      <DashboardHeader active="content" />
      <main style={pageWrapperStyle}>
        <h1>תכנים</h1>
        <ContentGrid initialGroups={initialGroups} />
      </main>
    </>
  )
}
