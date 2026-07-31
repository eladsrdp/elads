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
      const { data } = await supabase.from('participants').select().eq('id', id).maybeSingle()
      return data ?? undefined
    },

    async findParticipantByPhone(phone) {
      const { data } = await supabase.from('participants').select().eq('phone', phone).maybeSingle()
      return data ?? undefined
    },

    async getActiveParticipants() {
      const { data, error } = await supabase.from('participants').select().eq('status', 'active')
      if (error) throw new Error(`[supabase] participants: ${error.message}`)
      return data ?? []
    },

    async markParticipantCompleted(id) {
      await updateRow('participants', id, { status: 'completed' })
    },

    async createContentDay(input) {
      return insertAndReturn<ContentDayRow>('content_days', { day_number: input.dayNumber, title: input.title })
    },

    async getContentDay(dayNumber) {
      const { data } = await supabase.from('content_days').select().eq('day_number', dayNumber).maybeSingle()
      return data ?? undefined
    },

    async getMaxContentDayNumber() {
      const { data } = await supabase
        .from('content_days')
        .select('day_number')
        .order('day_number', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data?.day_number ?? 0
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
      const { data } = await supabase.from('messages').select().eq('id', id).maybeSingle()
      return data ?? undefined
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
      const { data } = await supabase
        .from('daily_triggers')
        .select()
        .eq('participant_id', participantId)
        .eq('calendar_date', calendarDate)
        .maybeSingle()
      return data ?? undefined
    },

    async getDailyTrigger(id) {
      const { data } = await supabase.from('daily_triggers').select().eq('id', id).maybeSingle()
      return data ?? undefined
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
      const { data, error } = await supabase
        .from('message_deliveries')
        .select()
        .eq('daily_trigger_id', dailyTriggerId)
        .eq('status', 'pending')
        .lte('scheduled_for', upTo)
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
      const { data } = await supabase
        .from('session_windows')
        .select('expires_at')
        .eq('participant_id', participantId)
        .maybeSingle()
      return !!data && data.expires_at > now
    },
  }
}
