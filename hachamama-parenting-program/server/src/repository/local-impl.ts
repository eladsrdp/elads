// מימוש Local של AppDB — in-memory, לפיתוח/בדיקות בלי Supabase אמיתי.
import { randomUUID } from 'node:crypto'
import type {
  AppDB,
  ContentDayRow,
  DailyTriggerRow,
  MessageDeliveryRow,
  MessageRow,
  ParticipantRow,
  SessionWindowRow,
  VideoSubmissionRow,
} from './interface.js'

export function createLocalDb(): AppDB {
  const participants = new Map<string, ParticipantRow>()
  const contentDays = new Map<number, ContentDayRow>()
  const messages = new Map<string, MessageRow>()
  const dailyTriggers = new Map<string, DailyTriggerRow>()
  const messageDeliveries = new Map<string, MessageDeliveryRow>()
  const sessionWindows = new Map<string, SessionWindowRow>()
  const videoSubmissions = new Map<string, VideoSubmissionRow>()

  return {
    async ping() {},

    async createParticipant(input) {
      const row: ParticipantRow = {
        id: randomUUID(),
        full_name: input.fullName,
        phone: input.phone,
        signup_source_ref: input.signupSourceRef,
        signup_at: input.signupAt,
        day1_date: input.day1Date,
        status: 'active',
      }
      participants.set(row.id, row)
      return row
    },

    async getParticipant(id) {
      return participants.get(id)
    },

    async findParticipantByPhone(phone) {
      return [...participants.values()].find((p) => p.phone === phone)
    },

    async getActiveParticipants() {
      return [...participants.values()].filter((p) => p.status === 'active')
    },

    async markParticipantCompleted(id) {
      const row = participants.get(id)
      if (row) participants.set(id, { ...row, status: 'completed' })
    },

    async createVideoSubmission(input) {
      const row: VideoSubmissionRow = {
        id: randomUUID(),
        participant_id: input.participantId,
        video_url: input.videoUrl,
        submitted_at: new Date().toISOString(),
      }
      videoSubmissions.set(row.id, row)
      return row
    },

    async createContentDay(input) {
      const row: ContentDayRow = { day_number: input.dayNumber, title: input.title }
      contentDays.set(row.day_number, row)
      return row
    },

    async getContentDay(dayNumber) {
      return contentDays.get(dayNumber)
    },

    async getMaxContentDayNumber() {
      const nums = [...contentDays.keys()]
      return nums.length ? Math.max(...nums) : 0
    },

    async createMessage(input) {
      const row: MessageRow = {
        id: randomUUID(),
        content_day_number: input.contentDayNumber,
        send_offset_time: input.sendOffsetTime,
        order_in_day: input.orderInDay,
        body_text: input.bodyText,
        media_url: input.mediaUrl,
        media_type: input.mediaType,
      }
      messages.set(row.id, row)
      return row
    },

    async getMessage(id) {
      return messages.get(id)
    },

    async getMessagesForContentDay(dayNumber) {
      return [...messages.values()]
        .filter((m) => m.content_day_number === dayNumber)
        .sort((a, b) => a.order_in_day - b.order_in_day)
    },

    async createDailyTrigger(input) {
      const row: DailyTriggerRow = {
        id: randomUUID(),
        participant_id: input.participantId,
        calendar_date: input.calendarDate,
        content_day_number: input.contentDayNumber,
        trigger_sent_at: null,
        clicked_at: null,
      }
      dailyTriggers.set(row.id, row)
      return row
    },

    async findDailyTrigger(participantId, calendarDate) {
      return [...dailyTriggers.values()].find(
        (t) => t.participant_id === participantId && t.calendar_date === calendarDate,
      )
    },

    async getDailyTrigger(id) {
      return dailyTriggers.get(id)
    },

    async getUnsentDailyTriggers(calendarDate) {
      return [...dailyTriggers.values()].filter((t) => t.calendar_date === calendarDate && !t.trigger_sent_at)
    },

    async markDailyTriggerSent(id, sentAt) {
      const row = dailyTriggers.get(id)
      if (row) dailyTriggers.set(id, { ...row, trigger_sent_at: sentAt })
    },

    async markDailyTriggerClicked(id, clickedAt) {
      const row = dailyTriggers.get(id)
      if (row) dailyTriggers.set(id, { ...row, clicked_at: clickedAt })
    },

    async createMessageDelivery(input) {
      const row: MessageDeliveryRow = {
        id: randomUUID(),
        participant_id: input.participantId,
        message_id: input.messageId,
        daily_trigger_id: input.dailyTriggerId,
        scheduled_for: input.scheduledFor,
        status: 'pending',
        sent_at: null,
      }
      messageDeliveries.set(row.id, row)
      return row
    },

    async getPendingDeliveriesForTrigger(dailyTriggerId, upTo) {
      // הערה: השוואת מחרוזות ISO תקינה כרונולוגית רק כי כל התאריכים באותו פורמט UTC (toISOString()).
      // מיון מפורש לפי scheduled_for — לא מסתמכים על סדר הוספה ל-Map (ראו code
      // review: ב-supabase-impl.ts PostgREST מחזיר סדר לא מוגדר בלי .order() מפורש).
      return [...messageDeliveries.values()]
        .filter((d) => d.daily_trigger_id === dailyTriggerId && d.status === 'pending' && d.scheduled_for <= upTo)
        .sort((a, b) => (a.scheduled_for < b.scheduled_for ? -1 : a.scheduled_for > b.scheduled_for ? 1 : 0))
    },

    async getDuePendingDeliveriesWithClickedTrigger(now) {
      return [...messageDeliveries.values()]
        .filter((d) => {
          if (d.status !== 'pending' || d.scheduled_for > now) return false
          const trigger = dailyTriggers.get(d.daily_trigger_id)
          return !!trigger?.clicked_at
        })
        .sort((a, b) => (a.scheduled_for < b.scheduled_for ? -1 : a.scheduled_for > b.scheduled_for ? 1 : 0))
    },

    async markDeliverySent(id, sentAt) {
      const row = messageDeliveries.get(id)
      if (row) messageDeliveries.set(id, { ...row, status: 'sent', sent_at: sentAt })
    },

    // opened_at מתאפס בכל קריאה — השורה מייצגת רק את החלון הנוכחי, לא היסטוריית-חיים.
    async openOrExtendSessionWindow(participantId, expiresAt) {
      sessionWindows.set(participantId, {
        participant_id: participantId,
        opened_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
    },

    async isSessionWindowOpen(participantId, now) {
      const row = sessionWindows.get(participantId)
      return !!row && row.expires_at > now
    },
  }
}
