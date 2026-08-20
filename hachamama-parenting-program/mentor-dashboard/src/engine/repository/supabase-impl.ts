// מימוש Supabase (Postgres אמיתי) של AppDB. הרץ קודם migrations/0001_init.sql
// על פרויקט Supabase, ואז SUPABASE_URL+SUPABASE_SERVICE_KEY מפעילים את המימוש הזה
// דרך repository/db.ts.
import { createClient } from '@supabase/supabase-js'
import type {
  AppDB,
  ContentDayRow,
  DailyTriggerRow,
  MessageDeliveryRow,
  MessageRow,
  ParticipantRow,
  VideoSubmissionRow,
} from './interface'

export function createSupabaseDb(url: string, key: string): AppDB {
  const supabase = createClient(url, key)

  async function insertAndReturn<T>(
    table: string,
    values: Record<string, unknown>,
  ): Promise<T> {
    const { data, error } = await supabase.from(table).insert(values).select().single()
    if (error) throw new Error(`[supabase] ${table}: ${error.message}`)
    return data as T
  }

  async function updateRow(table: string, id: string, values: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.from(table).update(values).eq('id', id)
    if (error) throw new Error(`[supabase] ${table}: ${error.message}`)
  }

  // עוזר משותף ל-.maybeSingle() — ראו code review: קודם לכן 7 מתודות התעלמו מ-error
  // כאן, מה שהיה מסתיר תקלת רשת/הרשאות כ"לא נמצא" (undefined/false) במקום לזרוק.
  // המקרה החריף ביותר: getMaxContentDayNumber שהחזירה 0 בשגיאה, מה שגרם ל-generate-daily
  // לסמן את כל הקבוצה הפעילה כ-completed בטעות (dayNumber > 0 נכון לרוב הנרשמים).
  async function maybeSingleOrThrow<T>(
    table: string,
    query: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  ): Promise<T | undefined> {
    const { data, error } = await query
    if (error) throw new Error(`[supabase] ${table}: ${error.message}`)
    return data ?? undefined
  }

  return {
    async ping() {
      await supabase.from('participants').select('id').limit(1)
    },

    async createParticipant(input) {
      return insertAndReturn<ParticipantRow>('participants', {
        full_name: input.fullName,
        phone: input.phone,
        signup_source_ref: input.signupSourceRef,
        signup_at: input.signupAt,
        day1_date: input.day1Date,
      })
    },

    async getParticipant(id) {
      return maybeSingleOrThrow('participants', supabase.from('participants').select().eq('id', id).maybeSingle())
    },

    async findParticipantByPhone(phone) {
      return maybeSingleOrThrow(
        'participants',
        supabase.from('participants').select().eq('phone', phone).maybeSingle(),
      )
    },

    async getActiveParticipants() {
      const { data, error } = await supabase.from('participants').select().eq('status', 'active')
      if (error) throw new Error(`[supabase] participants: ${error.message}`)
      return data ?? []
    },

    async getAllParticipants() {
      const { data, error } = await supabase.from('participants').select()
      if (error) throw new Error(`[supabase] participants: ${error.message}`)
      return data ?? []
    },

    async markParticipantCompleted(id) {
      await updateRow('participants', id, { status: 'completed' })
    },

    async createVideoSubmission(input) {
      return insertAndReturn<VideoSubmissionRow>('video_submissions', {
        participant_id: input.participantId,
        video_url: input.videoUrl,
      })
    },

    async createContentDay(input) {
      return insertAndReturn<ContentDayRow>('content_days', { day_number: input.dayNumber, title: input.title })
    },

    async getContentDay(dayNumber) {
      return maybeSingleOrThrow(
        'content_days',
        supabase.from('content_days').select().eq('day_number', dayNumber).maybeSingle(),
      )
    },

    async getMaxContentDayNumber() {
      const row = await maybeSingleOrThrow<{ day_number: number }>(
        'content_days',
        supabase.from('content_days').select('day_number').order('day_number', { ascending: false }).limit(1).maybeSingle(),
      )
      return row?.day_number ?? 0
    },

    async createMessage(input) {
      return insertAndReturn<MessageRow>('messages', {
        content_day_number: input.contentDayNumber,
        send_offset_time: input.sendOffsetTime,
        order_in_day: input.orderInDay,
        body_text: input.bodyText,
        media_url: input.mediaUrl,
        media_type: input.mediaType,
      })
    },

    async getMessage(id) {
      return maybeSingleOrThrow('messages', supabase.from('messages').select().eq('id', id).maybeSingle())
    },

    async getMessagesForContentDay(dayNumber) {
      const { data, error } = await supabase
        .from('messages')
        .select()
        .eq('content_day_number', dayNumber)
        .order('order_in_day', { ascending: true })
      if (error) throw new Error(`[supabase] messages: ${error.message}`)
      return data ?? []
    },

    async createDailyTrigger(input) {
      return insertAndReturn<DailyTriggerRow>('daily_triggers', {
        participant_id: input.participantId,
        calendar_date: input.calendarDate,
        content_day_number: input.contentDayNumber,
      })
    },

    async findDailyTrigger(participantId, calendarDate) {
      return maybeSingleOrThrow(
        'daily_triggers',
        supabase
          .from('daily_triggers')
          .select()
          .eq('participant_id', participantId)
          .eq('calendar_date', calendarDate)
          .maybeSingle(),
      )
    },

    async getDailyTrigger(id) {
      return maybeSingleOrThrow('daily_triggers', supabase.from('daily_triggers').select().eq('id', id).maybeSingle())
    },

    async getUnsentDailyTriggers(calendarDate) {
      const { data, error } = await supabase
        .from('daily_triggers')
        .select()
        .eq('calendar_date', calendarDate)
        .is('trigger_sent_at', null)
      if (error) throw new Error(`[supabase] daily_triggers: ${error.message}`)
      return data ?? []
    },

    async getDailyTriggersForDate(calendarDate) {
      const { data, error } = await supabase.from('daily_triggers').select().eq('calendar_date', calendarDate)
      if (error) throw new Error(`[supabase] daily_triggers: ${error.message}`)
      return data ?? []
    },

    async markDailyTriggerSent(id, sentAt) {
      await updateRow('daily_triggers', id, { trigger_sent_at: sentAt })
    },

    async markDailyTriggerClicked(id, clickedAt) {
      await updateRow('daily_triggers', id, { clicked_at: clickedAt })
    },

    async createMessageDelivery(input) {
      return insertAndReturn<MessageDeliveryRow>('message_deliveries', {
        participant_id: input.participantId,
        message_id: input.messageId,
        daily_trigger_id: input.dailyTriggerId,
        scheduled_for: input.scheduledFor,
      })
    },

    async getPendingDeliveriesForTrigger(dailyTriggerId, upTo) {
      // .order(scheduled_for) — בלי זה PostgREST מחזיר בסדר לא מוגדר, וההודעות
      // עלולות להישלח מעורבבות (ל-local-impl אין את הבעיה כי Map שומר סדר הוספה,
      // מה שהסתיר את זה מכל הבדיקות). ראו code review בסיום התוכנית.
      const { data, error } = await supabase
        .from('message_deliveries')
        .select()
        .eq('daily_trigger_id', dailyTriggerId)
        .eq('status', 'pending')
        .lte('scheduled_for', upTo)
        .order('scheduled_for', { ascending: true })
      if (error) throw new Error(`[supabase] message_deliveries: ${error.message}`)
      return data ?? []
    },

    async getDuePendingDeliveriesWithClickedTrigger(now) {
      const { data, error } = await supabase
        .from('message_deliveries')
        .select('*, daily_triggers!inner(clicked_at)')
        .eq('status', 'pending')
        .lte('scheduled_for', now)
        .not('daily_triggers.clicked_at', 'is', null)
        .order('scheduled_for', { ascending: true })
      if (error) throw new Error(`[supabase] message_deliveries: ${error.message}`)
      return (data ?? []) as MessageDeliveryRow[]
    },

    async markDeliverySent(id, sentAt) {
      await updateRow('message_deliveries', id, { status: 'sent', sent_at: sentAt })
    },

    async openOrExtendSessionWindow(participantId, expiresAt) {
      const { error } = await supabase
        .from('session_windows')
        .upsert(
          { participant_id: participantId, opened_at: new Date().toISOString(), expires_at: expiresAt },
          { onConflict: 'participant_id' },
        )
      if (error) throw new Error(`[supabase] session_windows: ${error.message}`)
    },

    async isSessionWindowOpen(participantId, now) {
      const row = await maybeSingleOrThrow<{ expires_at: string }>(
        'session_windows',
        supabase.from('session_windows').select('expires_at').eq('participant_id', participantId).maybeSingle(),
      )
      return !!row && row.expires_at > now
    },
  }
}
