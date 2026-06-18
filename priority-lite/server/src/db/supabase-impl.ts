// מימוש Supabase של AppDB — לסביבת ענן (Vercel).
import { createClient } from '@supabase/supabase-js'
import type { AppDB, EmployeeRow, OtpRow } from './interface'

export function createSupabaseDb(url: string, serviceKey: string): AppDB {
  // Node.js 20 has no native WebSocket. We don't use Supabase Realtime (DB queries only),
  // so provide a no-op transport to bypass the WebSocket check at client init time.
  // SECURITY: service_role key never logged; auth.persistSession false for serverless.
  class NoopWs {
    constructor(_url: string) {}
    close() {}
    send() {}
  }
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    realtime: { transport: NoopWs as any },
  })

  return {
    async findEmployee(phone) {
      const { data } = await client
        .from('employees')
        .select('phone, email, priority_emp_id, name, active, totp_secret')
        .eq('phone', phone)
        .eq('active', true)
        .maybeSingle()
      return (data as EmployeeRow) ?? undefined
    },

    async upsertEmployee(e) {
      const { error } = await client.from('employees').upsert({
        phone: e.phone,
        email: e.email,
        priority_emp_id: e.priorityEmpId,
        name: e.name,
        active: e.active !== false,
      })
      if (error) throw new Error(`upsertEmployee failed: ${error.message}`)
    },

    async setTotpSecret(phone, secret) {
      const { error } = await client.from('employees').update({ totp_secret: secret }).eq('phone', phone)
      if (error) throw new Error(`setTotpSecret failed: ${error.message}`)
    },

    async getOtpRow(phone) {
      const { data } = await client
        .from('otp_codes')
        .select('*')
        .eq('phone', phone)
        .maybeSingle()
      return (data as OtpRow) ?? undefined
    },

    async upsertOtp(row) {
      const { error } = await client.from('otp_codes').upsert(row)
      if (error) throw new Error(`upsertOtp failed: ${error.message}`)
    },

    async updateOtpAttempts(phone, attempts) {
      await client.from('otp_codes').update({ attempts }).eq('phone', phone)
    },

    async deleteOtp(phone) {
      await client.from('otp_codes').delete().eq('phone', phone)
    },
  }
}
