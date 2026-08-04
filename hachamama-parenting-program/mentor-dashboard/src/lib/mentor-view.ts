// לוגיקה טהורה שמעצבת נתונים לתצוגה — מקבלת MentorDataSource, לא יודעת שום דבר על Supabase.
// זה מה שהופך אותה לניתנת-לבדיקה בקלות מול fake (ראו mentor-view.test.ts).
import { calculateProgramDayNumber, getIsraelDateString } from './program-day'
import type { MentorDataSource } from './mentor-data-source'

export interface ParticipantListItem {
  id: string
  fullName: string
  phone: string
  status: string
  programDay: number
  clickedToday: boolean
}

export async function buildParticipantList(
  dataSource: MentorDataSource,
  now: Date,
): Promise<ParticipantListItem[]> {
  const todayDate = getIsraelDateString(now)
  const [participants, triggers] = await Promise.all([
    dataSource.listParticipants(),
    dataSource.getTriggersForDate(todayDate),
  ])
  const clickedByParticipant = new Map(triggers.map((t) => [t.participant_id, t.clicked_at !== null]))

  return participants.map((p) => ({
    id: p.id,
    fullName: p.full_name,
    phone: p.phone,
    status: p.status,
    programDay: calculateProgramDayNumber(p.day1_date, todayDate),
    clickedToday: clickedByParticipant.get(p.id) ?? false,
  }))
}

export interface DeliveryHistoryItem {
  messageId: string
  contentDayNumber: number
  sendOffsetTime: string
  bodyPreview: string
  status: string
  sentAt: string | null
}

export interface VideoSubmissionItem {
  id: string
  videoUrl: string
  submittedAt: string
}

export interface ParticipantDetailView {
  id: string
  fullName: string
  phone: string
  status: string
  day1Date: string
  deliveries: DeliveryHistoryItem[]
  videoSubmissions: VideoSubmissionItem[]
}

const BODY_PREVIEW_LENGTH = 60

export async function buildParticipantDetail(
  dataSource: MentorDataSource,
  participantId: string,
): Promise<ParticipantDetailView | null> {
  const participant = await dataSource.getParticipant(participantId)
  if (!participant) return null

  const [deliveries, videoSubmissions] = await Promise.all([
    dataSource.getDeliveriesForParticipant(participantId),
    dataSource.getVideoSubmissionsForParticipant(participantId),
  ])

  return {
    id: participant.id,
    fullName: participant.full_name,
    phone: participant.phone,
    status: participant.status,
    day1Date: participant.day1_date,
    deliveries: [...deliveries]
      .sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for))
      .map((d) => ({
        messageId: d.message_id,
        contentDayNumber: d.content_day_number,
        sendOffsetTime: d.send_offset_time,
        bodyPreview:
          d.body_text.length > BODY_PREVIEW_LENGTH ? `${d.body_text.slice(0, BODY_PREVIEW_LENGTH)}…` : d.body_text,
        status: d.status,
        sentAt: d.sent_at,
      })),
    videoSubmissions: videoSubmissions.map((v) => ({
      id: v.id,
      videoUrl: v.video_url,
      submittedAt: v.submitted_at,
    })),
  }
}
