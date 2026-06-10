// עוזרי תאריך — כל התאריכים בפורמט YYYY-MM-DD מקומי (לא UTC).

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

/** HH:MM משעת timestamp. */
export function fmtClock(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export interface DateRange {
  from: string
  to: string
}

export function rangeToday(): DateRange {
  const t = todayISO()
  return { from: t, to: t }
}

/** שבוע עבודה ישראלי: ראשון–שבת. */
export function rangeWeek(d = new Date()): DateRange {
  const start = new Date(d)
  start.setDate(d.getDate() - d.getDay())
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { from: toISODate(start), to: toISODate(end) }
}

export function rangeMonth(d = new Date()): DateRange {
  const start = new Date(d.getFullYear(), d.getMonth(), 1)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { from: toISODate(start), to: toISODate(end) }
}

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

/** "יום שלישי, 10.6" מתוך YYYY-MM-DD. */
export function fmtDateHe(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `יום ${DAY_NAMES[date.getDay()]}, ${d}.${m}`
}
