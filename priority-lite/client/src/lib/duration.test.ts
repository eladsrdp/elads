import { describe, expect, it } from 'vitest'
import { diffMinutes, fmtMin, parseDuration } from './duration'

describe('fmtMin', () => {
  it('מפרמט דקות לשעות:דקות', () => {
    expect(fmtMin(205)).toBe('3:25')
    expect(fmtMin(60)).toBe('1:00')
    expect(fmtMin(5)).toBe('0:05')
    expect(fmtMin(0)).toBe('0:00')
  })
})

describe('parseDuration', () => {
  it('מפענח פורמט שעות:דקות', () => {
    expect(parseDuration('1:30')).toBe(90)
    expect(parseDuration('0:45')).toBe(45)
    expect(parseDuration('10:05')).toBe(605)
  })
  it('מספרים עד 24 הם שעות', () => {
    expect(parseDuration('2')).toBe(120)
    expect(parseDuration('1.5')).toBe(90)
    expect(parseDuration('0.25')).toBe(15)
  })
  it('מספרים שלמים מעל 24 הם דקות', () => {
    expect(parseDuration('90')).toBe(90)
    expect(parseDuration('45')).toBe(45)
  })
  it('דוחה קלט לא תקין', () => {
    expect(parseDuration('')).toBeNull()
    expect(parseDuration('1:75')).toBeNull()
    expect(parseDuration('abc')).toBeNull()
    expect(parseDuration('0')).toBeNull()
    expect(parseDuration('2000')).toBeNull()
  })
})

describe('diffMinutes', () => {
  it('מחשב הפרש בין שעות', () => {
    expect(diffMinutes('09:00', '12:30')).toBe(210)
    expect(diffMinutes('23:00', '23:59')).toBe(59)
  })
  it('דוחה סדר הפוך או זהה', () => {
    expect(diffMinutes('12:00', '09:00')).toBeNull()
    expect(diffMinutes('09:00', '09:00')).toBeNull()
  })
})
