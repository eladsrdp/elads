// OTP logic — uses AppDB interface (works with both Supabase and local).
import { createHash, randomInt } from 'node:crypto'
import type { AppDB, EmployeeRow } from '../db/db'

export { type EmployeeRow }

export const OTP_TTL_MS = 10 * 60_000
export const RATE_WINDOW_MS = 15 * 60_000
export const MAX_SENDS_PER_WINDOW = 3
export const MAX_ATTEMPTS = 5

/** מנרמל טלפון ישראלי לפורמט 05XXXXXXXX. מחזיר null אם לא תקין. */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('972')) d = '0' + d.slice(3)
  return /^05\d{8}$/.test(d) ? d : null
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

export type RequestOtpResult =
  | { ok: true; code: string; employee: EmployeeRow }
  | { ok: false; error: 'invalid_phone' | 'not_registered' | 'rate_limited'; retryAfterMs?: number }

export async function requestOtp(db: AppDB, rawPhone: string, now = Date.now()): Promise<RequestOtpResult> {
  const phone = normalizePhone(rawPhone)
  if (!phone) return { ok: false, error: 'invalid_phone' }

  const employee = await db.findEmployee(phone)
  if (!employee) return { ok: false, error: 'not_registered' }

  const row = await db.getOtpRow(phone)
  const inWindow = row !== undefined && now - row.window_start < RATE_WINDOW_MS
  if (inWindow && row.sent_count >= MAX_SENDS_PER_WINDOW) {
    return { ok: false, error: 'rate_limited', retryAfterMs: row.window_start + RATE_WINDOW_MS - now }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await db.upsertOtp({
    phone,
    code_hash: hashCode(code),
    expires_at: now + OTP_TTL_MS,
    attempts: 0,
    sent_count: inWindow ? row.sent_count + 1 : 1,
    window_start: inWindow ? row.window_start : now,
  })

  return { ok: true, code, employee }
}

export type VerifyOtpResult =
  | { ok: true; employee: EmployeeRow }
  | { ok: false; error: 'invalid_phone' | 'no_code' | 'expired' | 'too_many_attempts' | 'wrong_code' }

export async function verifyOtp(
  db: AppDB,
  rawPhone: string,
  code: string,
  now = Date.now(),
): Promise<VerifyOtpResult> {
  const phone = normalizePhone(rawPhone)
  if (!phone) return { ok: false, error: 'invalid_phone' }

  const row = await db.getOtpRow(phone)
  if (!row) return { ok: false, error: 'no_code' }
  if (now > row.expires_at) {
    await db.deleteOtp(phone)
    return { ok: false, error: 'expired' }
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await db.deleteOtp(phone)
    return { ok: false, error: 'too_many_attempts' }
  }
  if (hashCode(code) !== row.code_hash) {
    await db.updateOtpAttempts(phone, row.attempts + 1)
    return { ok: false, error: 'wrong_code' }
  }

  const employee = await db.findEmployee(phone)
  await db.deleteOtp(phone)
  if (!employee) return { ok: false, error: 'no_code' }
  return { ok: true, employee }
}
