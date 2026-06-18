// מימוש Local של AppDB — in-memory לפיתוח מקומי.
// קורא עובדים מ-whitelist.json בהפעלה. OTP נשמר בזיכרון (נמחק ב-restart).
import { existsSync, readFileSync } from 'node:fs'
import type { AppDB, EmployeeRow, OtpRow } from './interface'

export function createLocalDb(whitelistPath = './whitelist.json'): AppDB {
  const employees = new Map<string, EmployeeRow>()
  const otps = new Map<string, OtpRow>()

  if (existsSync(whitelistPath)) {
    try {
      const raw = JSON.parse(readFileSync(whitelistPath, 'utf8')) as Array<{
        phone: string
        email: string
        priorityEmpId: string
        name: string
        active?: boolean
      }>
      for (const e of raw) {
        employees.set(e.phone, {
          phone: e.phone,
          email: e.email,
          priority_emp_id: e.priorityEmpId,
          name: e.name,
          active: e.active !== false,
          totp_secret: null,
        })
      }
      console.log(`[local-db] ${employees.size} עובדים נטענו מ-${whitelistPath}`)
    } catch (err) {
      console.warn(`[local-db] נכשל בטעינת ${whitelistPath}:`, err)
    }
  } else {
    console.warn(`[local-db] ${whitelistPath} לא נמצא — אין עובדים`)
  }

  return {
    async findEmployee(phone) {
      const e = employees.get(phone)
      return e?.active ? e : undefined
    },

    async upsertEmployee(e) {
      const existing = employees.get(e.phone)
      employees.set(e.phone, {
        phone: e.phone,
        email: e.email,
        priority_emp_id: e.priorityEmpId,
        name: e.name,
        active: e.active !== false,
        totp_secret: existing?.totp_secret ?? null,
      })
    },

    async setTotpSecret(phone, secret) {
      const row = employees.get(phone)
      if (row) employees.set(phone, { ...row, totp_secret: secret })
    },

    async getOtpRow(phone) {
      return otps.get(phone)
    },

    async upsertOtp(row) {
      otps.set(row.phone, row)
    },

    async updateOtpAttempts(phone, attempts) {
      const row = otps.get(phone)
      if (row) otps.set(phone, { ...row, attempts })
    },

    async deleteOtp(phone) {
      otps.delete(phone)
    },
  }
}
