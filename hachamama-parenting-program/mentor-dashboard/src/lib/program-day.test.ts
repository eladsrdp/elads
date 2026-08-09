import { describe, expect, it } from 'vitest'
import { calculateDay1Date, calculateMissedStreak, calculateProgramDayNumber, calculateWeekNumber, getIsraelDateString } from './program-day'

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

describe('calculateWeekNumber', () => {
  it('ימים 1-7 הם שבוע 1', () => {
    expect(calculateWeekNumber(1)).toBe(1)
    expect(calculateWeekNumber(7)).toBe(1)
  })

  it('יום 8 הוא תחילת שבוע 2', () => {
    expect(calculateWeekNumber(8)).toBe(2)
  })

  it('יום 26 (סוף שבוע 4) הוא שבוע 4', () => {
    expect(calculateWeekNumber(26)).toBe(4)
  })
})

describe('calculateDay1Date', () => {
  it('נרשם ביום שלישי מתחיל ביום ראשון הבא (לא באותו שבוע)', () => {
    // 2026-08-04 הוא יום שלישי
    expect(calculateDay1Date(new Date('2026-08-04T10:00:00Z'))).toBe('2026-08-09')
  })

  it('נרשם ביום ראשון עצמו מתחיל ביום ראשון הבא, לא באותו יום', () => {
    // 2026-08-02 הוא יום ראשון
    expect(calculateDay1Date(new Date('2026-08-02T10:00:00Z'))).toBe('2026-08-09')
  })
})

describe('calculateMissedStreak', () => {
  it('מחזיר null לנרשם לא-פעיל, בלי קשר להיסטוריה', () => {
    expect(calculateMissedStreak([{ calendarDate: '2026-08-16', clickedAt: null }], '2026-08-16', 'paused')).toBeNull()
    expect(calculateMissedStreak([], '2026-08-16', 'completed')).toBeNull()
  })

  it('לחץ היום → רצף 0', () => {
    const history = [{ calendarDate: '2026-08-16', clickedAt: '2026-08-16T06:10:00Z' }]
    expect(calculateMissedStreak(history, '2026-08-16', 'active')).toBe(0)
  })

  it('לא לחץ היום (יש לו trigger) ולחץ אתמול → רצף 1', () => {
    const history = [
      { calendarDate: '2026-08-16', clickedAt: null },
      { calendarDate: '2026-08-15', clickedAt: '2026-08-15T06:10:00Z' },
    ]
    expect(calculateMissedStreak(history, '2026-08-16', 'active')).toBe(1)
  })

  it('3 ימים ברצף בלי לחיצה, יום רביעי אחורה לחץ → רצף 3', () => {
    const history = [
      { calendarDate: '2026-08-16', clickedAt: null },
      { calendarDate: '2026-08-15', clickedAt: null },
      { calendarDate: '2026-08-14', clickedAt: null },
      { calendarDate: '2026-08-13', clickedAt: '2026-08-13T06:10:00Z' },
    ]
    expect(calculateMissedStreak(history, '2026-08-16', 'active')).toBe(3)
  })

  it('אין עדיין trigger להיום (ה-cron היומי לא רץ) — לא נספר כ"פספס"', () => {
    const history = [{ calendarDate: '2026-08-15', clickedAt: '2026-08-15T06:10:00Z' }]
    expect(calculateMissedStreak(history, '2026-08-16', 'active')).toBe(0)
  })

  it('יום 1 בתוכנית, עדיין לא לחץ, אין היסטוריה קודמת → רצף 1, לא ממשיך לפני day1', () => {
    const history = [{ calendarDate: '2026-08-16', clickedAt: null }]
    expect(calculateMissedStreak(history, '2026-08-16', 'active')).toBe(1)
  })
})
