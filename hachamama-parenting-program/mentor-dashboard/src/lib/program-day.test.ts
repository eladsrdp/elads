import { describe, expect, it } from 'vitest'
import { calculateProgramDayNumber, getIsraelDateString } from './program-day'

describe('calculateProgramDayNumber', () => {
  it('מחזיר 1 ביום ה-day1_date עצמו', () => {
    expect(calculateProgramDayNumber('2026-08-02', '2026-08-02')).toBe(1)
  })

  it('מחזיר 15 ב-day1_date + 14 יום', () => {
    expect(calculateProgramDayNumber('2026-08-02', '2026-08-16')).toBe(15)
  })
})

describe('getIsraelDateString', () => {
  it('ממיר רגע UTC לתאריך מקומי בישראל (קיץ, UTC+3)', () => {
    // 2026-08-02T21:30:00Z הוא כבר 2026-08-03 00:30 בישראל בקיץ
    expect(getIsraelDateString(new Date('2026-08-02T21:30:00Z'))).toBe('2026-08-03')
  })
})
