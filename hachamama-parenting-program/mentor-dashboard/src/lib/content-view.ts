// לוגיקה טהורה: קיבוץ הודעות לפי יום לתצוגה, וולידציית קובצי מדיה לפני העלאה.
import type { ContentDayRecord, MediaType, MessageRecord } from './content-data-source'

export interface DayGroup {
  dayNumber: number
  title: string | null
  messages: MessageRecord[]
}

export function groupMessagesByDay(days: ContentDayRecord[], messages: MessageRecord[]): DayGroup[] {
  const messagesByDay = new Map<number, MessageRecord[]>()
  for (const m of messages) {
    if (!messagesByDay.has(m.content_day_number)) messagesByDay.set(m.content_day_number, [])
    messagesByDay.get(m.content_day_number)!.push(m)
  }
  for (const list of messagesByDay.values()) {
    list.sort((a, b) => a.order_in_day - b.order_in_day)
  }

  return [...days]
    .sort((a, b) => a.day_number - b.day_number)
    .map((d) => ({
      dayNumber: d.day_number,
      title: d.title,
      messages: messagesByDay.get(d.day_number) ?? [],
    }))
}

const MAX_MEDIA_SIZE_BYTES = 20 * 1024 * 1024 // 20MB — גדול מספיק לתמונה/סרטון קצר, קטן מספיק לא לחסום שליחה ב-WhatsApp

const MIME_TO_MEDIA_TYPE: Record<string, MediaType> = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
  'video/quicktime': 'video',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
}

// סיומת גזורה מה-MIME המאומת, לא משם הקובץ המקורי — ראו uploadMedia ב-content-data-source.ts:
// שם קובץ שהמשתמש נתן יכול להכיל עברית/רווחים/תווים שנדחים כ-"Invalid key" ע"י Supabase Storage,
// ומטעמי אבטחה עדיף גם ככה שם רנדומלי במקום שם-קובץ-של-משתמש בנתיב האחסון.
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

export function extensionForMimeType(mimeType: string): string {
  return MIME_TO_EXTENSION[mimeType] ?? 'bin'
}

export type MediaValidationResult = { ok: true; mediaType: MediaType } | { ok: false; error: string }

export function validateMediaFile(file: { name: string; size: number; type: string }): MediaValidationResult {
  if (file.size > MAX_MEDIA_SIZE_BYTES) {
    return { ok: false, error: `הקובץ גדול מ-${MAX_MEDIA_SIZE_BYTES / (1024 * 1024)}MB` }
  }
  const mediaType = MIME_TO_MEDIA_TYPE[file.type]
  if (!mediaType) {
    return { ok: false, error: `סוג קובץ לא נתמך: ${file.type}` }
  }
  return { ok: true, mediaType }
}
