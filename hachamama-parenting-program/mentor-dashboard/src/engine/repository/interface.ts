// ממשק אחיד לשכבת ה-DB — מימושים: Local (in-memory, לפיתוח/בדיקות) ו-Supabase (ענן).
// שמות השדות ב-snake_case כדי למפות ישירות לעמודות ה-Postgres.

export type ParticipantStatus = 'active' | 'completed' | 'paused'

export interface ParticipantRow {
  id: string
  full_name: string
  phone: string
  signup_source_ref: string | null
  signup_at: string
  day1_date: string
  status: ParticipantStatus
  assigned_mentor_id: string | null
}

export interface ContentDayRow {
  day_number: number
  title: string | null
}

export type MediaType = 'image' | 'video' | 'audio' | 'document'

export interface MessageRow {
  id: string
  content_day_number: number
  send_offset_time: string
  order_in_day: number
  body_text: string
  media_url: string | null
  media_type: MediaType | null
}

export interface DailyTriggerRow {
  id: string
  participant_id: string
  calendar_date: string
  content_day_number: number
  trigger_sent_at: string | null
  clicked_at: string | null
}

export type DeliveryStatus = 'pending' | 'sent'

export interface MessageDeliveryRow {
  id: string
  participant_id: string
  message_id: string
  daily_trigger_id: string
  scheduled_for: string
  status: DeliveryStatus
  sent_at: string | null
}

export interface SessionWindowRow {
  participant_id: string
  opened_at: string
  expires_at: string
}

export interface VideoSubmissionRow {
  id: string
  participant_id: string
  video_url: string
  submitted_at: string
}

export interface GoalMessageRow {
  id: string
  participant_id: string
  questionnaire_number: number
  goal_answer: string
  scheduled_date: string
  sent_at: string | null
}

export interface AppDB {
  ping(): Promise<void>

  // participants
  createParticipant(input: {
    fullName: string
    phone: string
    signupSourceRef: string | null
    signupAt: string
    day1Date: string
  }): Promise<ParticipantRow>
  getParticipant(id: string): Promise<ParticipantRow | undefined>
  findParticipantByPhone(phone: string): Promise<ParticipantRow | undefined>
  getActiveParticipants(): Promise<ParticipantRow[]>
  getAllParticipants(): Promise<ParticipantRow[]>
  markParticipantCompleted(id: string): Promise<void>
  createVideoSubmission(input: { participantId: string; videoUrl: string }): Promise<VideoSubmissionRow>

  // goal messages (Plan C — הודעת מעקב מותאמת לתשובת "יעד" בשאלון)
  createGoalMessage(input: {
    participantId: string
    questionnaireNumber: number
    goalAnswer: string
    scheduledDate: string
  }): Promise<GoalMessageRow>
  getDueGoalMessages(calendarDate: string): Promise<GoalMessageRow[]>
  markGoalMessageSent(id: string, sentAt: string): Promise<void>

  // content
  createContentDay(input: { dayNumber: number; title: string | null }): Promise<ContentDayRow>
  getContentDay(dayNumber: number): Promise<ContentDayRow | undefined>
  getMaxContentDayNumber(): Promise<number>
  createMessage(input: {
    contentDayNumber: number
    sendOffsetTime: string
    orderInDay: number
    bodyText: string
    mediaUrl: string | null
    mediaType: MediaType | null
  }): Promise<MessageRow>
  getMessage(id: string): Promise<MessageRow | undefined>
  getMessagesForContentDay(dayNumber: number): Promise<MessageRow[]>

  // daily triggers
  createDailyTrigger(input: {
    participantId: string
    calendarDate: string
    contentDayNumber: number
  }): Promise<DailyTriggerRow>
  findDailyTrigger(participantId: string, calendarDate: string): Promise<DailyTriggerRow | undefined>
  getDailyTrigger(id: string): Promise<DailyTriggerRow | undefined>
  getUnsentDailyTriggers(calendarDate: string): Promise<DailyTriggerRow[]>
  getDailyTriggersForDate(calendarDate: string): Promise<DailyTriggerRow[]>
  markDailyTriggerSent(id: string, sentAt: string): Promise<void>
  markDailyTriggerClicked(id: string, clickedAt: string): Promise<void>

  // message deliveries
  createMessageDelivery(input: {
    participantId: string
    messageId: string
    dailyTriggerId: string
    scheduledFor: string
  }): Promise<MessageDeliveryRow>
  getPendingDeliveriesForTrigger(dailyTriggerId: string, upTo: string): Promise<MessageDeliveryRow[]>
  getDuePendingDeliveriesWithClickedTrigger(now: string): Promise<MessageDeliveryRow[]>
  markDeliverySent(id: string, sentAt: string): Promise<void>

  // session windows (אילוץ טכני גלובלי — לא קשור לאיזה יום שוחרר, ראו design doc)
  openOrExtendSessionWindow(participantId: string, expiresAt: string): Promise<void>
  isSessionWindowOpen(participantId: string, now: string): Promise<boolean>
}
