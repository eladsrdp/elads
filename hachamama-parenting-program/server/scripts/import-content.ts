// סקריפט ייבוא טבלת תוכן אמיתית מ-Airtable (export CSV) לתוך content_days + messages.
//
// המבנה האמיתי (לא "day_number,title,..." גנרי): כל שורה היא הודעה בודדת עם:
//   מסד    — מזהה רץ מ-Airtable, לא בהכרח רציף (לא day_number!)
//   מתי    — טקסט חופשי שמערבב יום-בשבוע + סוג הודעה + שעה, בסדר לא אחיד
//            (למשל "יום ראשון - הודעת תוכן 6:45" / "יום רביעי\n13:45\nתזכורת תוכן" /
//            "סרטון משימה 6:50" בלי יום-בשבוע בכלל — יורש מהשורה הקודמת)
//   תוכן   — גוף ההודעה
//   שבוע   — מספר שבוע בתוכנית (1-4 בקובץ הזה)
//   קובץ סיכום — לעיתים "שם-קובץ.png (https://...)" עם attachment URL מוטבע
//
// day_number = (שבוע-1)*7 + מיקום היום בשבוע (ראשון=1..שבת/מוצ"ש=7).
//
// הרצה:
//   npm run import:content -- "<csv-path>"                → דוח בלבד, בלי לכתוב ל-DB
//   npm run import:content -- "<csv-path>" --write         → כותב בפועל ל-Supabase
//
// חובה להריץ בלי --write קודם ולבדוק את הדוח — זה תוכן שיישלח בפועל למשתתפים אמיתיים.
import { readFileSync } from 'node:fs'
import { parse } from 'csv-parse/sync'
import type { MediaType } from '../src/repository/interface'
import { env } from '../src/env'
import { createDb } from '../src/repository/db'

const DAY_OFFSET: Record<string, number> = {
  ראשון: 1,
  שני: 2,
  שלישי: 3,
  רביעי: 4,
  חמישי: 5,
  שישי: 6,
  שבת: 7,
  'מוצ״ש': 7,
  'מוצ"ש': 7,
}
const DAY_TOKENS = Object.keys(DAY_OFFSET)

function extractDayToken(text: string): string | undefined {
  return DAY_TOKENS.find((token) => text.includes(token))
}

function extractTime(text: string): string | undefined {
  const match = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)
  if (!match) return undefined
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

function extractMedia(kovetsSikum: string | undefined): { mediaUrl: string | null; mediaType: MediaType | null } {
  if (!kovetsSikum) return { mediaUrl: null, mediaType: null }
  const urlMatch = kovetsSikum.match(/\((https?:\/\/[^)]+)\)/)
  if (!urlMatch) return { mediaUrl: null, mediaType: null }
  const mediaUrl = urlMatch[1]
  const ext = kovetsSikum.toLowerCase()
  let mediaType: MediaType | null = null
  if (/\.(png|jpe?g|gif|webp)/.test(ext)) mediaType = 'image'
  else if (/\.(mp4|mov)/.test(ext)) mediaType = 'video'
  else if (/\.(mp3|wav|ogg)/.test(ext)) mediaType = 'audio'
  else if (/\.pdf/.test(ext)) mediaType = 'document'
  return { mediaUrl, mediaType }
}

interface ParsedMessage {
  sourceId: string
  dayNumber: number
  sendOffsetTime: string
  timeInferred: boolean
  bodyText: string
  mediaUrl: string | null
  mediaType: MediaType | null
}

interface SkippedRow {
  sourceId: string
  reason: string
  rawMati: string
}

const FALLBACK_TIME_FOR_MOTZASH = '21:00' // אין שעה מפורשת ל-מוצ"ש במקור — הנחה, לאשר עם המשתמש

function parseRows(rows: Record<string, string>[]): { messages: ParsedMessage[]; skipped: SkippedRow[] } {
  const messages: ParsedMessage[] = []
  const skipped: SkippedRow[] = []
  let lastDayToken: string | undefined

  for (const row of rows) {
    const sourceId = row['מסד']?.trim() ?? '?'
    const mati = (row['מתי'] ?? '').trim()
    const week = Number(row['שבוע']?.trim())
    const bodyText = (row['תוכן'] ?? '').trim()

    if (!bodyText) {
      skipped.push({ sourceId, reason: 'אין טקסט תוכן', rawMati: mati })
      continue
    }
    // "בהנחה ש..." מסמן הודעה מותנית (למשל בהשלמת שאלון) — לא מתאים למודל
    // "יום קבוע + שעה קבועה" הנוכחי (Plan A/B), ולא בטוח לשייך ליום ע"י ירושה
    // מהשורה הקודמת (זה יגרום לה להישלח לכולם ללא תנאי). Plan C צריך לטפל בזה.
    if (mati.includes('בהנחה')) {
      skipped.push({ sourceId, reason: 'הודעה מותנית (תלויה במילוי שאלון) — לא נתמך במודל הנוכחי, ראה Plan C', rawMati: mati })
      continue
    }
    if (!Number.isInteger(week) || week < 1) {
      skipped.push({ sourceId, reason: `שבוע לא תקין: "${row['שבוע']}"`, rawMati: mati })
      continue
    }

    let dayToken = extractDayToken(mati)
    if (!dayToken) {
      if (!lastDayToken) {
        skipped.push({ sourceId, reason: 'אין יום-בשבוע בשורה הזו ואין שורה קודמת לירושה ממנה', rawMati: mati })
        continue
      }
      dayToken = lastDayToken // שורה בלי יום מפורש יורשת מהשורה הקודמת (למשל "סרטון משימה 6:50")
    }
    lastDayToken = dayToken

    let sendOffsetTime = extractTime(mati)
    let timeInferred = false
    if (!sendOffsetTime) {
      if (dayToken === 'מוצ״ש' || dayToken === 'מוצ"ש') {
        sendOffsetTime = FALLBACK_TIME_FOR_MOTZASH
        timeInferred = true
      } else {
        skipped.push({ sourceId, reason: 'אין שעה בשורה הזו ואין ברירת מחדל למקרה הזה', rawMati: mati })
        continue
      }
    }

    const dayNumber = (week - 1) * 7 + DAY_OFFSET[dayToken]
    const { mediaUrl, mediaType } = extractMedia(row['קובץ סיכום'])

    messages.push({ sourceId, dayNumber, sendOffsetTime, timeInferred, bodyText, mediaUrl, mediaType })
  }

  return { messages, skipped }
}

async function main() {
  const args = process.argv.slice(2)
  const csvPath = args.find((a) => !a.startsWith('--'))
  const write = args.includes('--write')
  if (!csvPath) throw new Error('שימוש: npm run import:content -- <csv-path> [--write]')

  const rows: Record<string, string>[] = parse(readFileSync(csvPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  const { messages, skipped } = parseRows(rows)

  const byDay = new Map<number, ParsedMessage[]>()
  for (const m of messages) {
    if (!byDay.has(m.dayNumber)) byDay.set(m.dayNumber, [])
    byDay.get(m.dayNumber)!.push(m)
  }

  console.log(`\n[import-content] נותח: ${messages.length} הודעות תקינות, ${skipped.length} שורות נדלגו.`)
  console.log(`[import-content] טווח ימים: ${Math.min(...byDay.keys())}–${Math.max(...byDay.keys())}, ${byDay.size} ימים עם תוכן.\n`)

  const inferredTime = messages.filter((m) => m.timeInferred)
  if (inferredTime.length) {
    console.log(`[import-content] ⚠ ${inferredTime.length} הודעות (מוצ"ש) קיבלו שעה משוערת (${FALLBACK_TIME_FOR_MOTZASH}) — אין שעה במקור:`)
    for (const m of inferredTime) console.log(`  מסד ${m.sourceId} → יום ${m.dayNumber}`)
    console.log('')
  }

  if (skipped.length) {
    console.log(`[import-content] שורות שנדלגו לגמרי (לא ייכתבו ל-DB):`)
    for (const s of skipped) console.log(`  מסד ${s.sourceId}: ${s.reason} | מתי="${s.rawMati.replace(/\n/g, ' / ')}"`)
    console.log('')
  }

  console.log('[import-content] פירוט לפי יום:')
  for (const dayNumber of [...byDay.keys()].sort((a, b) => a - b)) {
    const msgs = byDay.get(dayNumber)!.sort((a, b) => a.sendOffsetTime.localeCompare(b.sendOffsetTime))
    console.log(`  יום ${dayNumber}: ${msgs.map((m) => m.sendOffsetTime).join(', ')}`)
  }

  if (!write) {
    console.log('\n[import-content] זהו דוח בלבד — שום דבר לא נכתב ל-DB. הרץ עם --write כדי לכתוב בפועל.')
    return
  }

  if (!env.SUPABASE_URL) {
    console.warn('[import-content] ⚠ SUPABASE_URL לא מוגדר — הכתיבה תלך ל-in-memory DB ותאבד!')
  }
  const db = await createDb(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  let daysCreated = 0
  let messagesCreated = 0
  for (const dayNumber of [...byDay.keys()].sort((a, b) => a - b)) {
    const existing = await db.getContentDay(dayNumber)
    if (!existing) {
      await db.createContentDay({ dayNumber, title: null })
      daysCreated++
    }
    const msgs = byDay.get(dayNumber)!.sort((a, b) => a.sendOffsetTime.localeCompare(b.sendOffsetTime))
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i]
      await db.createMessage({
        contentDayNumber: dayNumber,
        sendOffsetTime: m.sendOffsetTime,
        orderInDay: i,
        bodyText: m.bodyText,
        mediaUrl: m.mediaUrl,
        mediaType: m.mediaType,
      })
      messagesCreated++
    }
  }
  console.log(`\n[import-content] ✅ נכתב בפועל: ${daysCreated} content_days חדשים, ${messagesCreated} הודעות.`)
}

main()
