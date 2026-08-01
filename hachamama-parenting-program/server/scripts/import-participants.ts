// סקריפט חד-פעמי לייבוא מנויים קיימים (Airtable export → CSV) לתוך participants.
//
// הרצה:
//   npm run import:participants -- ./participants.csv
//   npm run import:participants -- ./participants.csv --start-program-day=15 --start-date=2026-08-02
//
// עמודות CSV מצופות (case-insensitive, אחד מהשמות הנפוצים לכל שדה מתקבל):
//   full_name / Full Name / Name / שם / שם מלא   — חובה
//   phone / Phone / טלפון                          — חובה (מנרמל ספרות; מוסיף + אם חסר)
//   signup_at / Signup Date / תאריך הרשמה           — אופציונלי (ISO), משמש רק אם אין override
//   source_ref / Source / מקור                     — אופציונלי
//
// --start-program-day + --start-date: override חד-פעמי לכל השורות — למשל מיגרציה
// שבה כל המנויים הקיימים "מתחילים" מיום מסוים בתוכנית בתאריך מסוים, בלי קשר
// לתאריך ההרשמה ההיסטורי שלהם ב-Airtable. --start-date מתייחס למחר כברירת מחדל.
// בלי הדגלים האלה — day1_date מחושב per-row מ-signup_at לפי הכלל הרגיל (יום ראשון
// אחרי ההרשמה, ראו src/domain/scheduling.ts).
import { readFileSync } from 'node:fs'
import { parse } from 'csv-parse/sync'
import { calculateDay1Date } from '../src/domain/scheduling'
import { env } from '../src/env'
import { createDb } from '../src/repository/db'

function findColumn(row: Record<string, string>, candidates: string[]): string | undefined {
  const keys = Object.keys(row)
  for (const candidate of candidates) {
    const key = keys.find((k) => k.trim().toLowerCase() === candidate.toLowerCase())
    if (key && row[key]?.trim()) return row[key].trim()
  }
  return undefined
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  // מספר ישראלי מקומי (05X-XXXXXXX, בלי קוד מדינה) — כמו בעמודת "טלפון" הגולמית
  // ב-Airtable, לפני הניקוי ל-fixphone. מחליף את ה-0 המוביל בקוד המדינה 972.
  if (digits.startsWith('0')) return `+972${digits.slice(1)}`
  return `+${digits}`
}

function parseArgs(argv: string[]) {
  const csvPath = argv.find((a) => !a.startsWith('--'))
  if (!csvPath) {
    throw new Error(
      'שימוש: npm run import:participants -- <csv-path> [--start-program-day=N] [--start-date=YYYY-MM-DD]',
    )
  }
  const startProgramDayArg = argv.find((a) => a.startsWith('--start-program-day='))
  const startDateArg = argv.find((a) => a.startsWith('--start-date='))
  return {
    csvPath,
    startProgramDay: startProgramDayArg ? Number(startProgramDayArg.split('=')[1]) : undefined,
    startDate: startDateArg ? startDateArg.split('=')[1] : undefined,
  }
}

const DAY_NAMES_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

function computeOverrideDay1Date(startProgramDay: number, startDateArg: string | undefined): string {
  const effectiveDate = startDateArg ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const [y, m, d] = effectiveDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const dayName = DAY_NAMES_HE[dt.getUTCDay()]
  dt.setUTCDate(dt.getUTCDate() - (startProgramDay - 1))
  const day1Date = dt.toISOString().slice(0, 10)
  console.log(
    `[import] override: כל המנויים יתחילו מ-day1_date=${day1Date}, כדי שב-${effectiveDate} (יום ${dayName}) יהיו ביום ${startProgramDay} בתוכנית.`,
  )
  if (dayName !== 'ראשון') {
    console.warn(
      `[import] ⚠ שים לב: ${effectiveDate} הוא יום ${dayName}, לא יום ראשון. אם התוכן מאורגן בשבועות שמתחילים ביום ראשון, ` +
        'ייתכן שזה לא מסתדר עם "תחילת שבוע 3" — בדוק ידנית לפני ריצה על נתונים אמיתיים.',
    )
  }
  return day1Date
}

async function main() {
  const { csvPath, startProgramDay, startDate } = parseArgs(process.argv.slice(2))

  const overrideDay1Date =
    startProgramDay !== undefined ? computeOverrideDay1Date(startProgramDay, startDate) : undefined

  const rows: Record<string, string>[] = parse(readFileSync(csvPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  if (!env.SUPABASE_URL) {
    console.warn('[import] ⚠ SUPABASE_URL לא מוגדר — הייבוא ירוץ על in-memory DB ויאבד כשהתהליך יסתיים!')
  }
  const db = await createDb(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

  let created = 0
  const errors: Array<{ row: number; error: string }> = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const fullName = findColumn(row, ['full_name', 'Full Name', 'Name', 'שם', 'שם מלא'])
      // fixphone (עמודת פורמט מתוקן מ-Airtable, אם קיימת) קודמת ל-phone/טלפון הגולמי.
      const phoneRaw = findColumn(row, ['fixphone', 'phone', 'Phone', 'טלפון'])
      if (!fullName || !phoneRaw) {
        throw new Error(`חסר שם או טלפון`)
      }
      const phone = normalizePhone(phoneRaw)
      const sourceRef = findColumn(row, ['source_ref', 'Source', 'מקור']) ?? null
      const signupAtRaw = findColumn(row, ['signup_at', 'Signup Date', 'תאריך הרשמה', 'תאריך הצטרפות'])
      const signupAt = signupAtRaw ? new Date(signupAtRaw).toISOString() : new Date().toISOString()

      const day1Date = overrideDay1Date ?? calculateDay1Date(new Date(signupAt))

      await db.createParticipant({ fullName, phone, signupSourceRef: sourceRef, signupAt, day1Date })
      created++
    } catch (err) {
      errors.push({ row: i + 2, error: err instanceof Error ? err.message : String(err) }) // +2: header + 1-index
    }
  }

  console.log(`[import] נוצרו ${created} מנויים מתוך ${rows.length} שורות.`)
  if (errors.length) {
    console.log(`[import] ${errors.length} שגיאות:`)
    for (const e of errors) console.log(`  שורה ${e.row}: ${e.error}`)
  }
}

main()
