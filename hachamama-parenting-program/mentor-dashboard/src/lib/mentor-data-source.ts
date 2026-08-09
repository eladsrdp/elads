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
  assigned_mentor_id: string | null
}

export interface MentorRecord {
  user_id: string
  full_name: string
}

export interface TriggerHistoryRecord {
  participant_id: string
  calendar_date: string
  clicked_at: string | null
}

export interface DeliveryCountRecord {
  participant_id: string
  status: string
}

export interface VideoCountRecord {
  participant_id: string
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
  getTriggersSince(fromDate: string): Promise<TriggerHistoryRecord[]>
  getDeliveryCountsByParticipant(): Promise<DeliveryCountRecord[]>
  getVideoSubmissionCountsByParticipant(): Promise<VideoCountRecord[]>
  getParticipant(id: string): Promise<ParticipantRecord | null>
  getDeliveriesForParticipant(participantId: string): Promise<DeliveryRecord[]>
  getVideoSubmissionsForParticipant(participantId: string): Promise<VideoSubmissionRecord[]>
  listMentors(): Promise<MentorRecord[]>
  createParticipant(input: {
    fullName: string
    phone: string
    day1Date: string
    assignedMentorId: string | null
  }): Promise<ParticipantRecord>
  updateParticipant(
    id: string,
    input: { fullName: string; phone: string; status: string; assignedMentorId: string | null },
  ): Promise<void>
  deleteParticipant(id: string): Promise<void>
  getParticipantHistoryCounts(id: string): Promise<{ triggers: number; deliveries: number; videoSubmissions: number }>
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
        .select('id, full_name, phone, status, day1_date, assigned_mentor_id')
        .order('full_name', { ascending: true })
      if (error) throw error
      return data as ParticipantRecord[]
    },

    async getTriggersSince(fromDate) {
      const { data, error } = await supabase
        .from('daily_triggers')
        .select('participant_id, calendar_date, clicked_at')
        .gte('calendar_date', fromDate)
      if (error) throw error
      return data as TriggerHistoryRecord[]
    },

    async getDeliveryCountsByParticipant() {
      const { data, error } = await supabase.from('message_deliveries').select('participant_id, status')
      if (error) throw error
      return data as DeliveryCountRecord[]
    },

    async getVideoSubmissionCountsByParticipant() {
      const { data, error } = await supabase.from('video_submissions').select('participant_id')
      if (error) throw error
      return data as VideoCountRecord[]
    },

    async getParticipant(id) {
      const { data, error } = await supabase
        .from('participants')
        .select('id, full_name, phone, status, day1_date, assigned_mentor_id')
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

    async listMentors() {
      const { data, error } = await supabase.from('mentors').select('user_id, full_name').order('full_name', { ascending: true })
      if (error) throw error
      return data as MentorRecord[]
    },

    async createParticipant(input) {
      const { data, error } = await supabase
        .from('participants')
        .insert({
          full_name: input.fullName,
          phone: input.phone,
          signup_source_ref: 'mentor-dashboard',
          signup_at: new Date().toISOString(),
          day1_date: input.day1Date,
          assigned_mentor_id: input.assignedMentorId,
        })
        .select('id, full_name, phone, status, day1_date, assigned_mentor_id')
        .single()
      if (error) throw error
      return data as ParticipantRecord
    },

    async updateParticipant(id, input) {
      const { error } = await supabase
        .from('participants')
        .update({
          full_name: input.fullName,
          phone: input.phone,
          status: input.status,
          assigned_mentor_id: input.assignedMentorId,
        })
        .eq('id', id)
      if (error) throw error
    },

    async deleteParticipant(id) {
      const { error } = await supabase.from('participants').delete().eq('id', id)
      if (error) throw error
    },

    async getParticipantHistoryCounts(id) {
      const [triggers, deliveries, videoSubmissions] = await Promise.all([
        supabase.from('daily_triggers').select('id', { count: 'exact', head: true }).eq('participant_id', id),
        supabase.from('message_deliveries').select('id', { count: 'exact', head: true }).eq('participant_id', id),
        supabase.from('video_submissions').select('id', { count: 'exact', head: true }).eq('participant_id', id),
      ])
      if (triggers.error) throw triggers.error
      if (deliveries.error) throw deliveries.error
      if (videoSubmissions.error) throw videoSubmissions.error
      return {
        triggers: triggers.count ?? 0,
        deliveries: deliveries.count ?? 0,
        videoSubmissions: videoSubmissions.count ?? 0,
      }
    },
  }
}
