// עזרי תאריך. כל החישובים ב-UTC כדי להימנע מבעיות אזור זמן.
// פורמט מחרוזת: ISO date 'YYYY-MM-DD'.

export function toISO(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s)
  d.setUTCDate(d.getUTCDate() + n)
  return toISO(d)
}

/** מספר הימים מ-a עד b (b - a). חיובי אם b אחרי a. */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000)
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate()
}

/** היום של "today" (לפי שעון מקומי) כ-ISO. */
export function todayISO(): string {
  const now = new Date()
  return toISO(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())))
}

/**
 * המופע הקרוב של יום היעד (targetDay) החל מ-today (כולל).
 * אם today כבר אחרי יום היעד בחודש הנוכחי — מחזיר את יום היעד בחודש הבא.
 * אם targetDay גדול ממספר הימים בחודש — נצמד ליום האחרון של החודש.
 */
export function nextTargetDate(today: string, targetDay: number): string {
  const d = parseISO(today)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const day = d.getUTCDate()

  const clampedThis = Math.min(targetDay, daysInMonth(y, m))
  if (day <= clampedThis) {
    return toISO(new Date(Date.UTC(y, m, clampedThis)))
  }

  const ny = m === 11 ? y + 1 : y
  const nm = (m + 1) % 12
  const clampedNext = Math.min(targetDay, daysInMonth(ny, nm))
  return toISO(new Date(Date.UTC(ny, nm, clampedNext)))
}

/** כל הימים בטווח [start, end] כולל, כמערך ISO. */
export function eachDayInclusive(start: string, end: string): string[] {
  const out: string[] = []
  let cur = start
  while (daysBetween(cur, end) >= 0) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

/**
 * כל המופעים של יום-בחודש מסוים בתוך טווח [start, end] כולל.
 * נצמד ליום האחרון של החודש אם dayOfMonth חורג ממספר ימי החודש.
 */
export function occurrencesInWindow(dayOfMonth: number, start: string, end: string): string[] {
  const out: string[] = []
  const s = parseISO(start)
  let y = s.getUTCFullYear()
  let m = s.getUTCMonth()
  // עוברים חודש-חודש מתחילת הטווח עד שעוברים את הסוף
  while (true) {
    const clamped = Math.min(dayOfMonth, daysInMonth(y, m))
    const iso = toISO(new Date(Date.UTC(y, m, clamped)))
    if (daysBetween(iso, end) < 0) break
    if (daysBetween(start, iso) >= 0) out.push(iso)
    m += 1
    if (m > 11) {
      m = 0
      y += 1
    }
  }
  return out
}
