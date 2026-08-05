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
  assignedMentorId: string | null
  assignedMentorName: string | null
}

export async function buildParticipantList(
  dataSource: MentorDataSource,
  now: Date,
): Promise<ParticipantListItem[]> {
  const todayDate = getIsraelDateString(now)
  const [participants, triggers, mentors] = await Promise.all([
    dataSource.listParticipants(),
    dataSource.getTriggersForDate(todayDate),
    dataSource.listMentors(),
  ])
  const clickedByParticipant = new Map(triggers.map((t) => [t.participant_id, t.clicked_at !== null]))
  const mentorNameById = new Map(mentors.map((m) => [m.user_id, m.full_name]))

  return participants.map((p) => ({
    id: p.id,
    fullName: p.full_name,
    phone: p.phone,
    status: p.status,
    programDay: calculateProgramDayNumber(p.day1_date, todayDate),
    clickedToday: clickedByParticipant.get(p.id) ?? false,
    assignedMentorId: p.assigned_mentor_id,
    assignedMentorName: p.assigned_mentor_id ? (mentorNameById.get(p.assigned_mentor_id) ?? null) : null,
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

export function canDeleteParticipant(counts: { triggers: number; deliveries: number; videoSubmissions: number }): boolean {
  return counts.triggers === 0 && counts.deliveries === 0 && counts.videoSubmissions === 0
}
