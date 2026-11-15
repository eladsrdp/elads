// אזורי זמן שניתן לבחור בדשבורד (IANA). הצעה קצרה לשימוש נפוץ — ה-API של ההרשמה מקבל כל אזור IANA תקין.
export const DEFAULT_TIMEZONE = 'Asia/Jerusalem'

export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Asia/Jerusalem', label: 'ישראל' },
  { value: 'America/New_York', label: 'ארה"ב — מזרח (ניו יורק)' },
  { value: 'America/Chicago', label: 'ארה"ב — מרכז (שיקגו)' },
  { value: 'America/Denver', label: 'ארה"ב — הרים (דנוור)' },
  { value: 'America/Los_Angeles', label: 'ארה"ב — מערב (לוס אנג׳לס)' },
  { value: 'Europe/London', label: 'לונדון' },
]

/** כולל את האזור הנוכחי של המשתתפת גם אם הוא לא ברשימה הקבועה (למשל נרשמה דרך ה-API עם אזור אחר). */
export function timezoneOptionsFor(current: string): { value: string; label: string }[] {
  return TIMEZONE_OPTIONS.some((o) => o.value === current)
    ? TIMEZONE_OPTIONS
    : [...TIMEZONE_OPTIONS, { value: current, label: current }]
}

export function timezoneLabel(zone: string): string {
  return TIMEZONE_OPTIONS.find((o) => o.value === zone)?.label ?? zone
}
