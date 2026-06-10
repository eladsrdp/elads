import { describe, expect, it } from 'vitest'
import { fmtDateHe, rangeMonth, rangeWeek, toISODate } from './date'

describe('toISODate', () => {
  it('פורמט מקומי עם אפסים מובילים', () => {
    expect(toISODate(new Date(2026, 5, 10))).toBe('2026-06-10')
    expect(toISODate(new Date(2026, 0, 1))).toBe('2026-01-01')
  })
})

describe('rangeWeek', () => {
  it('שבוע ישראלי מתחיל ביום ראשון', () => {
    // 10.6.2026 הוא יום רביעי → ראשון = 7.6
    const r = rangeWeek(new Date(2026, 5, 10))
    expect(r.from).toBe('2026-06-07')
    expect(r.to).toBe('2026-06-13')
  })
  it('יום ראשון עצמו הוא תחילת השבוע', () => {
    const r = rangeWeek(new Date(2026, 5, 7))
    expect(r.from).toBe('2026-06-07')
  })
})

describe('rangeMonth', () => {
  it('מהראשון עד סוף החודש', () => {
    const r = rangeMonth(new Date(2026, 5, 10))
    expect(r.from).toBe('2026-06-01')
    expect(r.to).toBe('2026-06-30')
  })
  it('פברואר בשנה מעוברת', () => {
    const r = rangeMonth(new Date(2028, 1, 5))
    expect(r.to).toBe('2028-02-29')
  })
})

describe('fmtDateHe', () => {
  it('שם יום בעברית + תאריך קצר', () => {
    expect(fmtDateHe('2026-06-10')).toBe('יום רביעי, 10.6')
  })
})
