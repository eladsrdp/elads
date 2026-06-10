// OTP logic — async because Supabase calls are async.
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

async function getOtpRow(db: DB, phone: string): Promise<OtpRow | undefined> {
  const { data } = await db.from('otp_codes').select('*').eq('phone', phone).maybeSingle()
  return data ?? undefined
}

async function deleteOtp(db: DB, phone: string): Promise<void> {
  await db.from('otp_codes').delete().eq('phone', phone)
}

export type RequestOtpResult =
  | { ok: true; code: string; employee: EmployeeRow }
  | { ok: false; error: 'invalid_phone' | 'not_registered' | 'rate_limited'; retryAfterMs?: number }

export async function requestOtp(db: DB, rawPhone: string, now = Date.now()): Promise<RequestOtpResult> {
  const phone = normalizePhone(rawPhone)
  if (!phone) return { ok: false, error: 'invalid_phone' }
  const employee = await findEmployee(db, phone)
  if (!employee) return { ok: false, error: 'not_registered' }

  const row = await getOtpRow(db, phone)
  const inWindow = row !== undefined && now - row.window_start < RATE_WINDOW_MS
  if (inWindow && row.sent_count >= MAX_SENDS_PER_WINDOW) {
    return { ok: false, error: 'rate_limited', retryAfterMs: row.window_start + RATE_WINDOW_MS - now }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const { error } = await db.from('otp_codes').upsert({
    phone,
    code_hash: hashCode(code),
    expires_at: now + OTP_TTL_MS,
    attempts: 0,
    sent_count: inWindow ? row.sent_count + 1 : 1,
    window_start: inWindow ? row.window_start : now,
  })
  if (error) throw new Error(`requestOtp DB error: ${error.message}`)

  return { ok: true, code, employee }
}

export type VerifyOtpResult =
  | { ok: true; employee: EmployeeRow }
  | { ok: false; error: 'invalid_phone' | 'no_code' | 'expired' | 'too_many_attempts' | 'wrong_code' }

export async function verifyOtp(db: DB, rawPhone: string, code: string, now = Date.now()): Promise<VerifyOtpResult> {
  const phone = normalizePhone(rawPhone)
  if (!phone) return { ok: false, error: 'invalid_phone' }
  const row = await getOtpRow(db, phone)
  if (!row) return { ok: false, error: 'no_code' }
  if (now > row.expires_at) {
    await deleteOtp(db, phone)
    return { ok: false, error: 'expired' }
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await deleteOtp(db, phone)
    return { ok: false, error: 'too_many_attempts' }
  }
  if (hashCode(code) !== row.code_hash) {
    await db.from('otp_codes').update({ attempts: row.attempts + 1 }).eq('phone', phone)
    return { ok: false, error: 'wrong_code' }
  }
  const employee = await findEmployee(db, phone)
  await deleteOtp(db, phone)
  if (!employee) return { ok: false, error: 'no_code' }
  return { ok: true, employee }
}
