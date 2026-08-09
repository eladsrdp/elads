// לוגיקת תאריכים טהורה — כפילות מכוונת וקטנה מ-server/src/domain/scheduling.ts
// (שתי אפליקציות עצמאיות ונפרסות בנפרד; לא הופך פונקציה של כמה שורות לחבילה משותפת — YAGNI).
import { DateTime } from 'luxon'

const ISRAEL_ZONE = 'Asia/Jerusalem'

/** התאריך המקומי בישראל של רגע נתון, כ-YYYY-MM-DD. */
export function getIsraelDateString(instant: Date): string {
  return DateTime.fromJSDate(instant).setZone(ISRAEL_ZONE).toISODate() as string
}

/** באיזה "יום בתוכנית" (1-based) הנרשם נמצא, בהינתן day1_date שלו והתאריך הנוכחי. */
export function calculateProgramDayNumber(day1Date: string, todayDate: string): number {
  const d1 = DateTime.fromISO(day1Date, { zone: 'utc' })
  const today = DateTime.fromISO(todayDate, { zone: 'utc' })
  const diffDays = today.diff(d1, 'days').days
  return Math.round(diffDays) + 1
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

/** באיזה שבוע בתוכנית (1-based) נמצא יום נתון — כל שבוע הוא 7 ימים, יום 1 הוא תמיד יום ראשון. */
export function calculateWeekNumber(dayNumber: number): number {
  return Math.ceil(dayNumber / 7)
}

export interface DailyTriggerHistoryEntry {
  calendarDate: string
  clickedAt: string | null
}

/**
 * כמה ימים ברצף (מהיום אחורה) שהנרשם לא לחץ על כפתור הבוקר. `null` אם הנרשם לא
 * פעיל (paused/completed) — הרצף לא רלוונטי עבורו. "היום" נספר כ"לא לחץ" רק אם
 * כבר קיים לו daily_trigger להיום (אחרת ה-cron היומי עוד לא רץ, ומוקדם לתייג
 * "פספס"). העצירה קורית גם בפער (אין trigger לאותו תאריך) — סימן שהתוכנית עדיין
 * לא התחילה עבורו באותו תאריך, אין למה להמשיך אחורה.
 */
export function calculateMissedStreak(
  history: DailyTriggerHistoryEntry[],
  todayDate: string,
  participantStatus: string,
): number | null {
  if (participantStatus !== 'active') return null

  const clickedAtByDate = new Map(history.map((h) => [h.calendarDate, h.clickedAt]))
  let cursor = DateTime.fromISO(todayDate, { zone: 'utc' })
  if (!clickedAtByDate.has(cursor.toISODate() as string)) {
    cursor = cursor.minus({ days: 1 })
  }

  let streak = 0
  while (clickedAtByDate.has(cursor.toISODate() as string)) {
    if (clickedAtByDate.get(cursor.toISODate() as string) !== null) break
    streak++
    cursor = cursor.minus({ days: 1 })
  }
  return streak
}
