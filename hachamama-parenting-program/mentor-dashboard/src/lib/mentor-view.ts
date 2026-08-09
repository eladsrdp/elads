// לוגיקה טהורה שמעצבת נתונים לתצוגה — מקבלת MentorDataSource, לא יודעת שום דבר על Supabase.
// זה מה שהופך אותה לניתנת-לבדיקה בקלות מול fake (ראו mentor-view.test.ts).
import { DateTime } from 'luxon'
import { calculateMissedStreak, calculateProgramDayNumber, getIsraelDateString } from './program-day'
import type { MentorDataSource } from './mentor-data-source'

const STREAK_LOOKBACK_DAYS = 30

export interface ParticipantListItem {
  id: string
  fullName: string
  phone: string
  status: string
  programDay: number
  clickedToday: boolean
  missedStreak: number | null
  videoCount: number
  deliveriesSent: number
  deliveriesTotal: number
  assignedMentorId: string | null
  assignedMentorName: string | null
}

export async function buildParticipantList(
  dataSource: MentorDataSource,
  now: Date,
): Promise<ParticipantListItem[]> {
  const todayDate = getIsraelDateString(now)
  const lookbackDate = DateTime.fromISO(todayDate, { zone: 'utc' }).minus({ days: STREAK_LOOKBACK_DAYS }).toISODate() as string

  const [participants, recentTriggers, mentors, deliveryRows, videoRows] = await Promise.all([
    dataSource.listParticipants(),
    dataSource.getTriggersSince(lookbackDate),
    dataSource.listMentors(),
    dataSource.getDeliveryCountsByParticipant(),
    dataSource.getVideoSubmissionCountsByParticipant(),
  ])

  const triggersByParticipant = new Map<string, { calendarDate: string; clickedAt: string | null }[]>()
  for (const t of recentTriggers) {
    const list = triggersByParticipant.get(t.participant_id) ?? []
    list.push({ calendarDate: t.calendar_date, clickedAt: t.clicked_at })
    triggersByParticipant.set(t.participant_id, list)
  }

  const deliveryCountsByParticipant = new Map<string, { sent: number; total: number }>()
  for (const d of deliveryRows) {
    const counts = deliveryCountsByParticipant.get(d.participant_id) ?? { sent: 0, total: 0 }
    counts.total++
    if (d.status === 'sent') counts.sent++
    deliveryCountsByParticipant.set(d.participant_id, counts)
  }

  const videoCountByParticipant = new Map<string, number>()
  for (const v of videoRows) {
    videoCountByParticipant.set(v.participant_id, (videoCountByParticipant.get(v.participant_id) ?? 0) + 1)
  }

  const mentorNameById = new Map(mentors.map((m) => [m.user_id, m.full_name]))

  return participants.map((p) => {
    const triggerHistory = triggersByParticipant.get(p.id) ?? []
    const clickedToday = triggerHistory.some((t) => t.calendarDate === todayDate && t.clickedAt !== null)
    const deliveryCounts = deliveryCountsByParticipant.get(p.id) ?? { sent: 0, total: 0 }

    return {
      id: p.id,
      fullName: p.full_name,
      phone: p.phone,
      status: p.status,
      programDay: calculateProgramDayNumber(p.day1_date, todayDate),
      clickedToday,
      missedStreak: calculateMissedStreak(triggerHistory, todayDate, p.status),
      videoCount: videoCountByParticipant.get(p.id) ?? 0,
      deliveriesSent: deliveryCounts.sent,
      deliveriesTotal: deliveryCounts.total,
      assignedMentorId: p.assigned_mentor_id,
      assignedMentorName: p.assigned_mentor_id ? (mentorNameById.get(p.assigned_mentor_id) ?? null) : null,
    }
  })
}

/** ממיין לתשומת-לב: רצף גבוה יותר קודם, מי שהרצף לא רלוונטי לו (null) שוקע לתחתית, שוברי שוויון לפי שם. */
export function sortParticipantsByAttention(items: ParticipantListItem[]): ParticipantListItem[] {
  return [...items].sort((a, b) => {
    const aStreak = a.missedStreak ?? -1
    const bStreak = b.missedStreak ?? -1
    if (aStreak !== bStreak) return bStreak - aStreak
    return a.fullName.localeCompare(b.fullName)
  })
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
  assignedMentorId: string | null
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
    assignedMentorId: participant.assigned_mentor_id,
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
