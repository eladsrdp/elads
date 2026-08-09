// hachamama-parenting-program/mentor-dashboard/src/app/participants/[id]/page.tsx
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseMentorDataSource } from '@/lib/mentor-data-source'
import { buildParticipantDetail } from '@/lib/mentor-view'
import { DashboardHeader } from '@/components/dashboard-header'
import { pageWrapperStyle, BRAND } from '@/lib/brand'
import { ParticipantDetailContent } from './participant-detail-content'

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const dataSource = createSupabaseMentorDataSource(supabase)
  const [detail, mentors] = await Promise.all([buildParticipantDetail(dataSource, id), dataSource.listMentors()])
  if (!detail) notFound()

  return (
    <>
      <DashboardHeader active="participants" />
      <main style={pageWrapperStyle}>
        <h1>{detail.fullName}</h1>
        <p style={{ color: BRAND.greenMuted }}>
          טלפון: {detail.phone} | סטטוס: {detail.status} | יום 1: {detail.day1Date}
        </p>
        <ParticipantDetailContent detail={detail} mentors={mentors} />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: BRAND.paper }}>
              <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '6px' }}>יום</th>
              <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '6px' }}>שעה</th>
              <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '6px' }}>תוכן</th>
              <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '6px' }}>סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {detail.deliveries.map((d) => (
              <tr key={d.messageId} style={{ borderTop: `1px solid ${BRAND.border}` }}>
                <td style={{ padding: '6px' }}>{d.contentDayNumber}</td>
                <td style={{ padding: '6px' }}>{d.sendOffsetTime}</td>
                <td style={{ padding: '6px' }}>{d.bodyPreview}</td>
                <td style={{ padding: '6px' }}>{d.status === 'sent' ? '✅ נשלח' : '⏳ ממתין'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {detail.videoSubmissions.length > 0 && (
          <>
            <h2 style={{ marginTop: 24 }}>סרטונים שהועלו</h2>
            <ul>
              {detail.videoSubmissions.map((v) => (
                <li key={v.id}>
                  <a href={v.videoUrl} target="_blank" rel="noreferrer" style={{ color: BRAND.greenDark }}>
                    צפייה בסרטון
                  </a>
                  {' — '}
                  {v.submittedAt}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  )
}
