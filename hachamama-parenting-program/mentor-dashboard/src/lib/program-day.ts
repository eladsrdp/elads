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
