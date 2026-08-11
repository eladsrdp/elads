// שכבת גישה ל-Supabase למסך ניהול התוכן — thin adapter, לא נבדק ישירות (כמו mentor-data-source.ts).
// הלוגיקה שכן שווה בדיקה נמצאת ב-content-view.ts.
import type { SupabaseClient } from '@supabase/supabase-js'

export type MediaType = 'image' | 'video' | 'audio' | 'document'

export interface ContentDayRecord {
  day_number: number
  title: string | null
}

export interface MessageRecord {
  id: string
  content_day_number: number
  send_offset_time: string
  order_in_day: number
  body_text: string
  media_url: string | null
  media_type: MediaType | null
}

export interface ContentDataSource {
  listAllContentDays(): Promise<ContentDayRecord[]>
  listAllMessages(): Promise<MessageRecord[]>
  ensureContentDay(dayNumber: number): Promise<void>
  createContentDay(dayNumber: number, title: string | null): Promise<ContentDayRecord>
  createMessage(input: { contentDayNumber: number; sendOffsetTime: string; orderInDay: number }): Promise<MessageRecord>
  updateMessageBody(id: string, bodyText: string): Promise<void>
  updateMessageTime(id: string, sendOffsetTime: string): Promise<void>
  updateMessageOrder(id: string, orderInDay: number): Promise<void>
  updateMessageMedia(id: string, mediaUrl: string | null, mediaType: MediaType | null): Promise<void>
  deleteMessage(id: string): Promise<void>
  hasDeliveries(messageId: string): Promise<boolean>
  uploadMedia(file: File, contentDayNumber: number): Promise<{ url: string; path: string }>
}

export function createSupabaseContentDataSource(supabase: SupabaseClient): ContentDataSource {
  return {
    async listAllContentDays() {
      const { data, error } = await supabase.from('content_days').select('day_number, title').order('day_number', { ascending: true })
      if (error) throw error
      return data as ContentDayRecord[]
    },

    async listAllMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content_day_number, send_offset_time, order_in_day, body_text, media_url, media_type')
        .order('content_day_number', { ascending: true })
        .order('order_in_day', { ascending: true })
      if (error) throw error
      return data as MessageRecord[]
    },

    async ensureContentDay(dayNumber) {
      const { error } = await supabase.from('content_days').upsert({ day_number: dayNumber }, { onConflict: 'day_number', ignoreDuplicates: true })
      if (error) throw error
    },

    // בכוונה insert רגיל, לא upsert-ignore כמו ensureContentDay — יוצר יום ריק (בלי הודעה)
    // במפורש, ונכשל אם היום כבר קיים (unique constraint על day_number), כדי שהמנחה תדע.
    async createContentDay(dayNumber, title) {
      const { data, error } = await supabase
        .from('content_days')
        .insert({ day_number: dayNumber, title })
        .select('day_number, title')
        .single()
      if (error) throw error
      return data as ContentDayRecord
    },

    async createMessage(input) {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content_day_number: input.contentDayNumber,
          send_offset_time: input.sendOffsetTime,
          order_in_day: input.orderInDay,
          body_text: '',
          media_url: null,
          media_type: null,
        })
        .select('id, content_day_number, send_offset_time, order_in_day, body_text, media_url, media_type')
        .single()
      if (error) throw error
      return data as MessageRecord
    },

    async updateMessageBody(id, bodyText) {
      const { error } = await supabase.from('messages').update({ body_text: bodyText }).eq('id', id)
      if (error) throw error
    },

    async updateMessageTime(id, sendOffsetTime) {
      const { error } = await supabase.from('messages').update({ send_offset_time: sendOffsetTime }).eq('id', id)
      if (error) throw error
    },

    async updateMessageOrder(id, orderInDay) {
      const { error } = await supabase.from('messages').update({ order_in_day: orderInDay }).eq('id', id)
      if (error) throw error
    },

    async updateMessageMedia(id, mediaUrl, mediaType) {
      const { error } = await supabase.from('messages').update({ media_url: mediaUrl, media_type: mediaType }).eq('id', id)
      if (error) throw error
    },

    async deleteMessage(id) {
      const { error } = await supabase.from('messages').delete().eq('id', id)
      if (error) throw error
    },

    async hasDeliveries(messageId) {
      const { count, error } = await supabase
        .from('message_deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('message_id', messageId)
      if (error) throw error
      return (count ?? 0) > 0
    },

    async uploadMedia(file, contentDayNumber) {
      const path = `content-day-${contentDayNumber}/${crypto.randomUUID()}-${file.name}`
      const { error } = await supabase.storage.from('media').upload(path, file)
      if (error) throw error
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      return { url: data.publicUrl, path }
    },
  }
}
