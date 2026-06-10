// עוזרי משך זמן — תצוגה ופענוח קלט גמיש.

/** 205 → "3:25" */
export function fmtMin(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

/**
 * פענוח קלט משך גמיש:
 *   "1:30" → 90 ; "2" → 120 (שעות) ; "1.5" → 90 ; "90" → 90 (דקות, כשמעל 24)
 * ערכים עד 24 מתפרשים כשעות, מעל — כדקות.
 */
export function parseDuration(input: string): number | null {
  const t = input.trim()
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(':').map(Number)
    if (m >= 60) return null
    const total = h * 60 + m
    return total > 0 && total <= 24 * 60 ? total : null
  }
  if (/^\d+(\.\d+)?$/.test(t)) {
    const v = Number(t)
    if (v <= 0) return null
    if (v <= 24) return Math.round(v * 60) // שעות
    if (Number.isInteger(v) && v <= 24 * 60) return v // דקות
  }
  return null
}

/** הפרש דקות בין שתי שעות HH:MM באותו יום. null אם הסדר הפוך. */
export function diffMinutes(start: string, end: string): number | null {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = eh * 60 + em - (sh * 60 + sm)
  return diff > 0 ? diff : null
}
