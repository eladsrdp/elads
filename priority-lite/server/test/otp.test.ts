// בדיקות ללוגיקת ה-OTP: נרמול טלפון, happy path, rate limit, תפוגה, ניסיונות.
import { beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_ATTEMPTS,
  MAX_SENDS_PER_WINDOW,
  OTP_TTL_MS,
  RATE_WINDOW_MS,
  normalizePhone,
  requestOtp,
  verifyOtp,
} from '../src/auth/otp'
import { createDb, upsertEmployee, type DB } from '../src/db/db'

const PHONE = '0501234567'
let db: DB

beforeEach(() => {
  db = createDb(':memory:')
  upsertEmployee(db, { phone: PHONE, email: 'elad@test.co', priorityEmpId: '42', name: 'אלעד' })
})

describe('normalizePhone', () => {
  it('מקבל פורמט מקומי כמו שהוא', () => {
    expect(normalizePhone('0501234567')).toBe('0501234567')
  })
  it('ממיר קידומת בינלאומית +972', () => {
    expect(normalizePhone('+972-50-123-4567')).toBe('0501234567')
  })
  it('מנקה רווחים ומקפים', () => {
    expect(normalizePhone('050 123 4567')).toBe('0501234567')
  })
  it('דוחה מספרים לא תקינים', () => {
    expect(normalizePhone('12345')).toBeNull()
    expect(normalizePhone('0312345678')).toBeNull()
    expect(normalizePhone('')).toBeNull()
  })
})

describe('requestOtp', () => {
  it('מצליח לעובד רשום ומחזיר קוד בן 6 ספרות', () => {
    const r = requestOtp(db, PHONE)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.code).toMatch(/^\d{6}$/)
      expect(r.employee.priority_emp_id).toBe('42')
    }
  })

  it('נכשל למספר שאינו ב-whitelist', () => {
    const r = requestOtp(db, '0599999999')
    expect(r).toEqual({ ok: false, error: 'not_registered' })
  })

  it('חוסם אחרי המכסה ומשחרר אחרי החלון', () => {
    const now = Date.now()
    for (let i = 0; i < MAX_SENDS_PER_WINDOW; i++) {
      expect(requestOtp(db, PHONE, now + i).ok).toBe(true)
    }
    const blocked = requestOtp(db, PHONE, now + 1000)
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.error).toBe('rate_limited')

    const afterWindow = requestOtp(db, PHONE, now + RATE_WINDOW_MS + 1)
    expect(afterWindow.ok).toBe(true)
  })
})

describe('verifyOtp', () => {
  function issueCode(now = Date.now()): string {
    const r = requestOtp(db, PHONE, now)
    if (!r.ok) throw new Error('request failed')
    return r.code
  }

  it('happy path — קוד נכון מחזיר את העובד ומוחק את הקוד', () => {
    const code = issueCode()
    const r = verifyOtp(db, PHONE, code)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.employee.name).toBe('אלעד')
    // שימוש חוזר באותו קוד נכשל
    expect(verifyOtp(db, PHONE, code)).toEqual({ ok: false, error: 'no_code' })
  })

  it('קוד שפג תוקפו נדחה ונמחק', () => {
    const now = Date.now()
    const code = issueCode(now)
    expect(verifyOtp(db, PHONE, code, now + OTP_TTL_MS + 1)).toEqual({ ok: false, error: 'expired' })
  })

  it('אחרי מקסימום ניסיונות שגויים הקוד נחסם', () => {
    const code = issueCode()
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect(verifyOtp(db, PHONE, '000000')).toEqual({ ok: false, error: 'wrong_code' })
    }
    // גם הקוד הנכון כבר לא עובד
    expect(verifyOtp(db, PHONE, code)).toEqual({ ok: false, error: 'too_many_attempts' })
  })

  it('בקשת קוד חדש מבטלת את הקודם', () => {
    const now = Date.now()
    const first = issueCode(now)
    const second = issueCode(now + 1000)
    if (first !== second) {
      expect(verifyOtp(db, PHONE, first, now + 2000).ok).toBe(false)
    }
    expect(verifyOtp(db, PHONE, second, now + 2000).ok).toBe(true)
  })
})
