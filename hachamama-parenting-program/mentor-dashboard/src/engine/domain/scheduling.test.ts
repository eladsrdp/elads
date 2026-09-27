import { describe, expect, it } from 'vitest'
import {
  calculateDay1Date,
  calculateGoalMessageSendDate,
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

// עוגן: 2023-01-01 היה יום ראשון (כל השעות בטסטים האלה הן UTC, מומרות לישראל
// בפועל ע"י הפונקציה עצמה — בינואר ישראל היא UTC+2, בלי שעון קיץ).
describe('calculateGoalMessageSendDate', () => {
  it('ענו בראשון לפני 14:00 (שעון ישראל) → נשלח באותו ראשון', () => {
    expect(calculateGoalMessageSendDate(new Date('2023-01-01T08:00:00Z'))).toBe('2023-01-01') // 10:00 בישראל
  })

  it('ענו בראשון אחרי 14:00 → נשלח למחרת (שני)', () => {
    expect(calculateGoalMessageSendDate(new Date('2023-01-01T13:00:00Z'))).toBe('2023-01-02') // 15:00 בישראל
  })

  it('ענו בראשון בדיוק ב-14:00 → נחשב "אחרי", נשלח בשני', () => {
    expect(calculateGoalMessageSendDate(new Date('2023-01-01T12:00:00Z'))).toBe('2023-01-02') // 14:00 בישראל בדיוק
  })

  it('ענו בשני → נשלח בשלישי', () => {
    expect(calculateGoalMessageSendDate(new Date('2023-01-02T08:00:00Z'))).toBe('2023-01-03')
  })

  it('ענו בשלישי → נשלח ברביעי', () => {
    expect(calculateGoalMessageSendDate(new Date('2023-01-03T08:00:00Z'))).toBe('2023-01-04')
  })

  it('ענו ברביעי → נשלח בחמישי', () => {
    expect(calculateGoalMessageSendDate(new Date('2023-01-04T08:00:00Z'))).toBe('2023-01-05')
  })

  it('ענו בחמישי → קופץ לראשון הקרוב (לא לשישי)', () => {
    expect(calculateGoalMessageSendDate(new Date('2023-01-05T08:00:00Z'))).toBe('2023-01-08')
  })

  it('ענו בשישי → קופץ לראשון הקרוב (לא לשבת)', () => {
    expect(calculateGoalMessageSendDate(new Date('2023-01-06T08:00:00Z'))).toBe('2023-01-08')
  })

  it('ענו בשבת → נשלח בראשון', () => {
    expect(calculateGoalMessageSendDate(new Date('2023-01-07T08:00:00Z'))).toBe('2023-01-08')
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
