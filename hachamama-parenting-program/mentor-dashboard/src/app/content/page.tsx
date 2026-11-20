// hachamama-parenting-program/mentor-dashboard/src/app/content/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseContentDataSource } from '@/lib/content-data-source'
import { groupMessagesByDay } from '@/lib/content-view'
import { DashboardHeader } from '@/components/dashboard-header'
import { pageWrapperStyle } from '@/lib/brand'
import { ContentGrid } from './content-grid'
import { VersionBar } from './version-bar'

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ version?: string }> }) {
  const { version } = await searchParams
  const supabase = await createSupabaseServerClient()
  const dataSource = createSupabaseContentDataSource(supabase)
  const [days, versions] = await Promise.all([dataSource.listAllContentDays(), dataSource.listVersions()])
  // הגרסה שנבחרה ב-URL; אם אין / לא קיימת — גרסת ברירת המחדל (או הראשונה).
  const selected = versions.find((v) => v.id === version) ?? versions.find((v) => v.is_default) ?? versions[0]
  const messages = selected ? await dataSource.listMessagesForVersion(selected.id) : []
  const initialGroups = groupMessagesByDay(days, messages)

  return (
    <>
      <DashboardHeader active="content" />
      <main style={pageWrapperStyle}>
        <h1>תכנים</h1>
        {selected && <VersionBar versions={versions} selectedId={selected.id} />}
        {selected && <ContentGrid key={selected.id} initialGroups={initialGroups} versionId={selected.id} />}
      </main>
    </>
  )
}
