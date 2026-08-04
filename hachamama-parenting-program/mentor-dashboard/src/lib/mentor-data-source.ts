// שכבת גישה ל-Supabase לצורכי הדשבורד — thin adapter, לא נבדק ישירות (כמו
// server/src/repository/supabase-impl.ts). הלוגיקה שכן שווה בדיקה נמצאת ב-mentor-view.ts,
// שמקבל MentorDataSource כפרמטר ונבדק מול fake פשוט.
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ParticipantRecord {
  id: string
  full_name: string
  phone: string
  status: string
  day1_date: string
}

export interface DailyTriggerRecord {
  participant_id: string
  clicked_at: string | null
}

export interface DeliveryRecord {
  message_id: string
  status: string
  sent_at: string | null
  scheduled_for: string
  content_day_number: number
  send_offset_time: string
  body_text: string
}

export interface VideoSubmissionRecord {
  id: string
  video_url: string
  submitted_at: string
}

export interface MentorDataSource {
  listParticipants(): Promise<ParticipantRecord[]>
  getTriggersForDate(calendarDate: string): Promise<DailyTriggerRecord[]>
  getParticipant(id: string): Promise<ParticipantRecord | null>
  getDeliveriesForParticipant(participantId: string): Promise<DeliveryRecord[]>
  getVideoSubmissionsForParticipant(participantId: string): Promise<VideoSubmissionRecord[]>
}

// אין generated types ל-Supabase בפרויקט הזה (מגבלה ידועה, תואמת ל-server) — cast מפורש
// בנקודה היחידה שבה יש embedded relation (messages דרך message_deliveries).
interface DeliveryQueryRow {
  message_id: string
  status: string
  sent_at: string | null
  scheduled_for: string
  messages: { content_day_number: number; send_offset_time: string; body_text: string }
}

export function createSupabaseMentorDataSource(supabase: SupabaseClient): MentorDataSource {
  return {
    async listParticipants() {
      const { data, error } = await supabase
        .from('participants')
        .select('id, full_name, phone, status, day1_date')
        .order('full_name', { ascending: true })
      if (error) throw error
      return data as ParticipantRecord[]
    },

    async getTriggersForDate(calendarDate) {
      const { data, error } = await supabase
        .from('daily_triggers')
        .select('participant_id, clicked_at')
        .eq('calendar_date', calendarDate)
      if (error) throw error
      return data as DailyTriggerRecord[]
    },

    async getParticipant(id) {
      const { data, error } = await supabase
        .from('participants')
        .select('id, full_name, phone, status, day1_date')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return (data as ParticipantRecord | null) ?? null
    },

    async getDeliveriesForParticipant(participantId) {
      const { data, error } = await supabase
        .from('message_deliveries')
        .select('message_id, status, sent_at, scheduled_for, messages(content_day_number, send_offset_time, body_text)')
        .eq('participant_id', participantId)
        .order('scheduled_for', { ascending: true })
      if (error) throw error
      return (data as unknown as DeliveryQueryRow[]).map((row) => ({
        message_id: row.message_id,
        status: row.status,
        sent_at: row.sent_at,
        scheduled_for: row.scheduled_for,
        content_day_number: row.messages.content_day_number,
        send_offset_time: row.messages.send_offset_time,
        body_text: row.messages.body_text,
      }))
    },

    async getVideoSubmissionsForParticipant(participantId) {
      const { data, error } = await supabase
        .from('video_submissions')
        .select('id, video_url, submitted_at')
        .eq('participant_id', participantId)
        .order('submitted_at', { ascending: false })
      if (error) throw error
      return data as VideoSubmissionRecord[]
    },
  }
}
