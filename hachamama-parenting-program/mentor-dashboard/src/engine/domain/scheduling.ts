// לוגיקת תזמון טהורה — יום 1 של כל נרשם, "איזה יום בתוכנית הוא היום", והמרות אזור-זמן ישראל.
// כל חישוב "מהו התאריך היום" נעשה לפי Asia/Jerusalem, לא UTC — כי הריצות היומיות
// ותאריך ההרשמה נמדדים לפי הזמן המקומי של המשתמשים, לא לפי שרת ה-UTC.
//
// הועבר כמעט-מילה-במילה מ-hachamama-parenting-program/server/src/domain/scheduling.ts
import { DateTime } from 'luxon'

const ISRAEL_ZONE = 'Asia/Jerusalem'

/** התאריך המקומי בישראל של רגע נתון, כ-YYYY-MM-DD. */
export function getIsraelDateString(instant: Date): string {
  return DateTime.fromJSDate(instant).setZone(ISRAEL_ZONE).toISODate() as string
}

/**
 * יום 1 = יום ראשון הראשון שאחרי תאריך ההרשמה (לפי הזמן המקומי בישראל),
 * לעולם לא אותו יום ראשון עצמו — נרשם ביום ראשון מתחיל בראשון של השבוע הבא.
 */
export function calculateDay1Date(signupAt: Date): string {
  const israelSignup = DateTime.fromJSDate(signupAt).setZone(ISRAEL_ZONE)
  const dayOfWeek = israelSignup.weekday % 7 // luxon: 1=שני..7=ראשון → הופך ל-0=ראשון..6=שבת
  const daysUntilNextSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek
  return israelSignup.plus({ days: daysUntilNextSunday }).toISODate() as string
}

/** ממיר תאריך (YYYY-MM-DD) + שעה (HH:MM), שניהם בזמן המקומי בישראל, לרגע UTC מדויק. */
export function combineDateAndTimeInIsrael(calendarDate: string, hhmm: string): Date {
  const [year, month, day] = calendarDate.split('-').map(Number)
  const [hour, minute] = hhmm.split(':').map(Number)
  const dt = DateTime.fromObject({ year, month, day, hour, minute }, { zone: ISRAEL_ZONE })
  return dt.toJSDate()
}

/** באיזה "יום בתוכנית" (1-based) הנרשם נמצא, בהינתן day1_date שלו והתאריך הנוכחי. */
export function calculateProgramDayNumber(day1Date: string, todayDate: string): number {
  const d1 = DateTime.fromISO(day1Date, { zone: 'utc' })
  const today = DateTime.fromISO(todayDate, { zone: 'utc' })
  const diffDays = today.diff(d1, 'days').days
  return Math.round(diffDays) + 1
}

/** באיזה שבוע בתוכנית (1-based) נמצא יום נתון — כל שבוע הוא 7 ימים, יום 1 הוא תמיד יום ראשון (ראשון-שבת). */
export function calculateWeekNumber(dayNumber: number): number {
  return Math.ceil(dayNumber / 7)
}

/**
 * מתי לשלוח הודעת מעקב מותאמת לתשובת "יעד" בשאלון, בהינתן מתי ההורה ענה.
 * כלל (מאושר ע"י המשתמש): תאריך שליחה = תאריך מענה + יום אחד, ב-14:00 — אלא אם זה
 * נופל בשישי/שבת, ואז קופצים לראשון הקרוב (לא שולחים בשישי/שבת, כמו שאר התוכן).
 * חריג יחיד: מענה בראשון עצמו לפני 14:00 → נשלח באותו יום, לא למחרת.
 * מענה בדיוק ב-14:00 נחשב "אחרי" (המשתמש אישר).
 */
export function calculateGoalMessageSendDate(answeredAt: Date): string {
  const israelTime = DateTime.fromJSDate(answeredAt).setZone(ISRAEL_ZONE)
  const isSundayBeforeCutoff = israelTime.weekday === 7 && israelTime.hour < 14
  if (isSundayBeforeCutoff) return israelTime.toISODate() as string

  let sendDate = israelTime.startOf('day').plus({ days: 1 })
  if (sendDate.weekday === 5) sendDate = sendDate.plus({ days: 2 }) // שישי → קופץ לראשון
  else if (sendDate.weekday === 6) sendDate = sendDate.plus({ days: 1 }) // שבת → קופץ לראשון
  return sendDate.toISODate() as string
}
