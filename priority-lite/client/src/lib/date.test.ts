import { describe, expect, it } from 'vitest'
import { fmtDateHe, rangeMonth, rangeWeek, toISODate, workDaysElapsed } from './date'

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

describe('workDaysElapsed', () => {
  // שבוע 7.6.2026 (ראשון) עד 13.6 (שבת). א׳–ה׳ = 7,8,9,10,11.
  it('שבוע מלא בעבר → 5 ימי עבודה', () => {
    expect(workDaysElapsed('2026-06-07', '2026-06-13', '2026-06-20')).toBe(5)
  })
  it('חסום עד היום — רביעי 10.6 → א׳,ב׳,ג׳,ד׳ = 4', () => {
    expect(workDaysElapsed('2026-06-07', '2026-06-13', '2026-06-10')).toBe(4)
  })
  it('היום שישי → לא נספר, נשארים 5 מהשבוע', () => {
    expect(workDaysElapsed('2026-06-07', '2026-06-13', '2026-06-12')).toBe(5)
  })
  it('טווח של יום שישי בלבד → 0', () => {
    expect(workDaysElapsed('2026-06-12', '2026-06-12', '2026-06-12')).toBe(0)
  })
  it('טווח של שבת בלבד → 0', () => {
    expect(workDaysElapsed('2026-06-13', '2026-06-13', '2026-06-13')).toBe(0)
  })
  it('חודש יוני 2026 עד 10.6 (רביעי) → 8 ימי עבודה', () => {
    // 1ב׳,2ג׳,3ד׳,4ה׳ (5ו׳,6ש׳ מדולגים), 7א׳,8ב׳,9ג׳,10ד׳ = 8
    expect(workDaysElapsed('2026-06-01', '2026-06-30', '2026-06-10')).toBe(8)
  })
  it('לפני תחילת הטווח → 0', () => {
    expect(workDaysElapsed('2026-06-07', '2026-06-13', '2026-06-01')).toBe(0)
  })
})

describe('fmtDateHe', () => {
  it('שם יום בעברית + תאריך קצר', () => {
    expect(fmtDateHe('2026-06-10')).toBe('יום רביעי, 10.6')
  })
})
