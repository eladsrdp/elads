// hachamama-parenting-program/mentor-dashboard/src/app/participants/[id]/page.tsx
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseMentorDataSource } from '@/lib/mentor-data-source'
import { buildParticipantDetail } from '@/lib/mentor-view'

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const dataSource = createSupabaseMentorDataSource(supabase)
  const detail = await buildParticipantDetail(dataSource, id)
  if (!detail) notFound()

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>{detail.fullName}</h1>
      <p>
        טלפון: {detail.phone} | סטטוס: {detail.status} | יום 1: {detail.day1Date}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'right' }}>יום</th>
            <th style={{ textAlign: 'right' }}>שעה</th>
            <th style={{ textAlign: 'right' }}>תוכן</th>
            <th style={{ textAlign: 'right' }}>סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {detail.deliveries.map((d) => (
            <tr key={d.messageId} style={{ borderTop: '1px solid #ddd' }}>
              <td>{d.contentDayNumber}</td>
              <td>{d.sendOffsetTime}</td>
              <td>{d.bodyPreview}</td>
              <td>{d.status === 'sent' ? '✅ נשלח' : '⏳ ממתין'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {detail.videoSubmissions.length > 0 && (
        <>
          <h2>סרטונים שהועלו</h2>
          <ul>
            {detail.videoSubmissions.map((v) => (
              <li key={v.id}>
                <a href={v.videoUrl} target="_blank" rel="noreferrer">
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
  )
}
