// סקריפט חד-פעמי לייבוא טבלת תוכן (Airtable export → CSV) לתוך content_days + messages.
//
// הרצה: npm run import:content -- ./content.csv
//
// עמודות CSV מצופות (case-insensitive, אחד מהשמות הנפוצים מתקבל):
//   day_number / Day / יום                          — חובה (מספר שלם ≥ 1)
//   title / Title / כותרת                           — אופציונלי, ליום הראשון שמגיע עם המספר הזה
//   send_offset_time / Time / שעה                   — חובה (HH:MM, זמן מקומי בישראל)
//   order_in_day / Order / סדר                       — אופציונלי (מספר, ברירת מחדל 0)
//   body_text / Text / טקסט / הודעה                  — חובה
//   media_url / Media / מדיה                         — אופציונלי
//   media_type                                       — אופציונלי: image/video/audio/document
//
// אידמפוטנטי חלקית: content_day שכבר קיים ב-DB לא נדרס (title לא מתעדכן), אבל
// כל שורת CSV מייצרת message חדשה — אל תרוץ פעמיים על אותו קובץ בלי לנקות קודם.
import { readFileSync } from 'node:fs'
import { parse } from 'csv-parse/sync'
import type { MediaType } from '../src/repository/interface'
import { env } from '../src/env'
import { createDb } from '../src/repository/db'

const MEDIA_TYPES: readonly string[] = ['image', 'video', 'audio', 'document']

function findColumn(row: Record<string, string>, candidates: string[]): string | undefined {
  const keys = Object.keys(row)
  for (const candidate of candidates) {
    const key = keys.find((k) => k.trim().toLowerCase() === candidate.toLowerCase())
    if (key && row[key]?.trim()) return row[key].trim()
  }
  return undefined
}

async function main() {
  const csvPath = process.argv[2]
  if (!csvPath) throw new Error('שימוש: npm run import:content -- <csv-path>')

  const rows: Record<string, string>[] = parse(readFileSync(csvPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  if (!env.SUPABASE_URL) {
    console.warn('[import] ⚠ SUPABASE_URL לא מוגדר — הייבוא ירוץ על in-memory DB ויאבד כשהתהליך יסתיים!')
  }
  const db = await createDb(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  const seenDays = new Set<number>()
  let messagesCreated = 0
  const errors: Array<{ row: number; error: string }> = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const dayNumberRaw = findColumn(row, ['day_number', 'Day', 'יום'])
      const bodyText = findColumn(row, ['body_text', 'Text', 'טקסט', 'הודעה'])
      const sendOffsetTime = findColumn(row, ['send_offset_time', 'Time', 'שעה'])
      if (!dayNumberRaw || !bodyText || !sendOffsetTime) {
        throw new Error('חסר day_number, body_text, או send_offset_time')
      }
      const dayNumber = Number(dayNumberRaw)
      if (!Number.isInteger(dayNumber) || dayNumber < 1) {
        throw new Error(`day_number לא תקין: "${dayNumberRaw}"`)
      }
      if (!/^\d{2}:\d{2}$/.test(sendOffsetTime)) {
        throw new Error(`send_offset_time לא בפורמט HH:MM: "${sendOffsetTime}"`)
      }

      if (!seenDays.has(dayNumber)) {
        const existing = await db.getContentDay(dayNumber)
        if (!existing) {
          const title = findColumn(row, ['title', 'Title', 'כותרת']) ?? null
          await db.createContentDay({ dayNumber, title })
        }
        seenDays.add(dayNumber)
      }

      const orderRaw = findColumn(row, ['order_in_day', 'Order', 'סדר'])
      const mediaUrl = findColumn(row, ['media_url', 'Media', 'מדיה']) ?? null
      const mediaTypeRaw = findColumn(row, ['media_type'])
      const mediaType = (mediaTypeRaw && MEDIA_TYPES.includes(mediaTypeRaw) ? mediaTypeRaw : null) as MediaType | null

      await db.createMessage({
        contentDayNumber: dayNumber,
        sendOffsetTime,
        orderInDay: orderRaw ? Number(orderRaw) : 0,
        bodyText,
        mediaUrl,
        mediaType,
      })
      messagesCreated++
    } catch (err) {
      errors.push({ row: i + 2, error: err instanceof Error ? err.message : String(err) })
    }
  }

  console.log(`[import] נוצרו ${seenDays.size} content_days ו-${messagesCreated} הודעות מתוך ${rows.length} שורות.`)
  if (errors.length) {
    console.log(`[import] ${errors.length} שגיאות:`)
    for (const e of errors) console.log(`  שורה ${e.row}: ${e.error}`)
  }
}

main()
