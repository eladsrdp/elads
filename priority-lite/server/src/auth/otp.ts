// לוגיקת OTP טהורה — מקבלת DB ושעון כפרמטרים כדי להיות קלה לבדיקה.
import { createHash, randomInt } from 'node:crypto'
import type { DB, EmployeeRow } from '../db/db'
import { findEmployee } from '../db/db'

export const OTP_TTL_MS = 10 * 60_000
export const RATE_WINDOW_MS = 15 * 60_000
export const MAX_SENDS_PER_WINDOW = 3
export const MAX_ATTEMPTS = 5

interface OtpRow {
  phone: string
  code_hash: string
  expires_at: number
  attempts: number
  sent_count: number
  window_start: number
}

/** מנרמל טלפון ישראלי לפורמט 05XXXXXXXX. מחזיר null אם לא תקין. */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('972')) d = '0' + d.slice(3)
  return /^05\d{8}$/.test(d) ? d : null
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

function getOtpRow(db: DB, phone: string): OtpRow | undefined {
  return db.prepare('SELECT * FROM otp_codes WHERE phone = ?').get(phone) as OtpRow | undefined
}

function deleteOtp(db: DB, phone: string): void {
  db.prepare('DELETE FROM otp_codes WHERE phone = ?').run(phone)
}

export type RequestOtpResult =
  | { ok: true; code: string; employee: EmployeeRow }
  | { ok: false; error: 'invalid_phone' | 'not_registered' | 'rate_limited'; retryAfterMs?: number }

export function requestOtp(db: DB, rawPhone: string, now = Date.now()): RequestOtpResult {
  const phone = normalizePhone(rawPhone)
  if (!phone) return { ok: false, error: 'invalid_phone' }
  const employee = findEmployee(db, phone)
  if (!employee) return { ok: false, error: 'not_registered' }

  const row = getOtpRow(db, phone)
  const inWindow = row !== undefined && now - row.window_start < RATE_WINDOW_MS
  if (inWindow && row.sent_count >= MAX_SENDS_PER_WINDOW) {
    return { ok: false, error: 'rate_limited', retryAfterMs: row.window_start + RATE_WINDOW_MS - now }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  db.prepare(
    `INSERT INTO otp_codes (phone, code_hash, expires_at, attempts, sent_count, window_start)
     VALUES (?, ?, ?, 0, ?, ?)
     ON CONFLICT(phone) DO UPDATE SET
       code_hash = excluded.code_hash, expires_at = excluded.expires_at,
       attempts = 0, sent_count = excluded.sent_count, window_start = excluded.window_start`,
  ).run(
    phone,
    hashCode(code),
    now + OTP_TTL_MS,
    inWindow ? row.sent_count + 1 : 1,
    inWindow ? row.window_start : now,
  )

  return { ok: true, code, employee }
}

export type VerifyOtpResult =
  | { ok: true; employee: EmployeeRow }
  | { ok: false; error: 'invalid_phone' | 'no_code' | 'expired' | 'too_many_attempts' | 'wrong_code' }

export function verifyOtp(db: DB, rawPhone: string, code: string, now = Date.now()): VerifyOtpResult {
  const phone = normalizePhone(rawPhone)
  if (!phone) return { ok: false, error: 'invalid_phone' }
  const row = getOtpRow(db, phone)
  if (!row) return { ok: false, error: 'no_code' }
  if (now > row.expires_at) {
    deleteOtp(db, phone)
    return { ok: false, error: 'expired' }
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    deleteOtp(db, phone)
    return { ok: false, error: 'too_many_attempts' }
  }
  if (hashCode(code) !== row.code_hash) {
    db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = ?').run(phone)
    return { ok: false, error: 'wrong_code' }
  }
  const employee = findEmployee(db, phone)
  deleteOtp(db, phone)
  // ייתכן שהעובד הוסר מה-whitelist בין שליחת הקוד לאימות
  if (!employee) return { ok: false, error: 'no_code' }
  return { ok: true, employee }
}
