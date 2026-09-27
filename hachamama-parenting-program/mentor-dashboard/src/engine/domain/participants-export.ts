// לוגיקה טהורה: מיזוג רשימת נרשמים עם סטטוס טריגר-הבוקר של יום נתון — לשימוש ב-
// GET /api/webhooks/participants, שצריך להגיד ל-Make.com לא רק "מי הנרשמים" אלא
// גם "מי כבר לחץ היום ומי לא" בלי query נוסף מהצד שלהם.
import type { DailyTriggerRow, ParticipantRow } from '../repository/interface'

export interface ParticipantExportRow {
  participantId: string
  fullName: string
  phone: string
  status: string
  day1Date: string
  signupAt: string
  signupSourceRef: string | null
  assignedMentorId: string | null
  triggerSentToday: boolean
  clickedToday: boolean
}

export function buildParticipantsExport(
  participants: ParticipantRow[],
  todaysTriggers: DailyTriggerRow[],
): ParticipantExportRow[] {
  const triggerByParticipant = new Map(todaysTriggers.map((t) => [t.participant_id, t]))

  return participants.map((p) => {
    const trigger = triggerByParticipant.get(p.id)
    return {
      participantId: p.id,
      fullName: p.full_name,
      phone: p.phone,
      status: p.status,
      day1Date: p.day1_date,
      signupAt: p.signup_at,
      signupSourceRef: p.signup_source_ref,
      assignedMentorId: p.assigned_mentor_id,
      triggerSentToday: Boolean(trigger?.trigger_sent_at),
      clickedToday: Boolean(trigger?.clicked_at),
    }
  })
}
