import { describe, expect, it } from 'vitest'
import {
  calculateDay1Date,
  calculateProgramDayNumber,
  calculateWeekNumber,
  combineDateAndTimeInIsrael,
  getIsraelDateString,
} from './scheduling'

// עוגן: 2023-01-01 היה יום ראשון — קל לוודא ידנית שכל שאר התאריכים נכונים.
describe('calculateDay1Date', () => {
  it('נרשם ביום חמישי (2023-01-05) מתחיל בראשון הקרוב (2023-01-08)', () => {
    expect(calculateDay1Date(new Date('2023-01-05T10:00:00Z'))).toBe('2023-01-08')
  })

  it('נרשם ביום ראשון עצמו (2023-01-01) מתחיל בראשון הבא, לא באותו יום (2023-01-08)', () => {
    expect(calculateDay1Date(new Date('2023-01-01T10:00:00Z'))).toBe('2023-01-08')
  })

  it('נרשם בשבת (2023-01-07) מתחיל למחרת (2023-01-08)', () => {
    expect(calculateDay1Date(new Date('2023-01-07T10:00:00Z'))).toBe('2023-01-08')
  })

  it('מחשב לפי התאריך המקומי בישראל, לא UTC — שבת בלילה ב-UTC שהיא כבר ראשון בישראל', () => {
    // 2023-01-07T22:30Z + חורף בישראל (UTC+2, בלי שעון קיץ) = 2023-01-08T00:30 בישראל = יום ראשון
    // לכן היום הבא הוא בעוד שבוע שלם, לא המחר.
    expect(calculateDay1Date(new Date('2023-01-07T22:30:00Z'))).toBe('2023-01-15')
  })
})

describe('getIsraelDateString', () => {
  it('ממיר זמן UTC לתאריך מקומי בישראל (חורף, UTC+2)', () => {
    expect(getIsraelDateString(new Date('2023-01-07T22:30:00Z'))).toBe('2023-01-08')
  })

  it('ממיר זמן UTC לתאריך מקומי בישראל (קיץ, UTC+3, שעון קיץ)', () => {
    expect(getIsraelDateString(new Date('2023-06-15T21:30:00Z'))).toBe('2023-06-16')
  })
})

describe('combineDateAndTimeInIsrael', () => {
  it('ממיר תאריך+שעה בישראל ל-UTC נכון בחורף (UTC+2)', () => {
    const result = combineDateAndTimeInIsrael('2023-01-08', '07:00')
    expect(result.toISOString()).toBe('2023-01-08T05:00:00.000Z')
  })

  it('ממיר תאריך+שעה בישראל ל-UTC נכון בקיץ עם שעון קיץ (UTC+3)', () => {
    const result = combineDateAndTimeInIsrael('2023-06-15', '07:00')
    expect(result.toISOString()).toBe('2023-06-15T04:00:00.000Z')
  })
})

describe('calculateProgramDayNumber', () => {
  it('ביום ה-day1_date עצמו — יום 1', () => {
    expect(calculateProgramDayNumber('2023-01-08', '2023-01-08')).toBe(1)
  })

  it('יום אחרי day1_date — יום 2', () => {
    expect(calculateProgramDayNumber('2023-01-08', '2023-01-09')).toBe(2)
  })

  it('שבוע אחרי day1_date — יום 8', () => {
    expect(calculateProgramDayNumber('2023-01-08', '2023-01-15')).toBe(8)
  })
})

describe('calculateWeekNumber', () => {
  it('ימים 1-7 (ראשון עד שבת) הם שבוע 1', () => {
    expect(calculateWeekNumber(1)).toBe(1)
    expect(calculateWeekNumber(7)).toBe(1)
  })

  it('יום 8 (ראשון הבא) הוא שבוע 2', () => {
    expect(calculateWeekNumber(8)).toBe(2)
  })

  it('יום 23 הוא שבוע 4', () => {
    expect(calculateWeekNumber(23)).toBe(4)
  })
})
