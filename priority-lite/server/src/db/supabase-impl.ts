// מימוש Supabase של AppDB — לסביבת ענן (Vercel).
import { createClient } from '@supabase/supabase-js'
import type { AppDB, EmployeeRow, OtpRow } from './interface'

export function createSupabaseDb(url: string, serviceKey: string): AppDB {
  const client = createClient(url, serviceKey, { auth: { persistSession: false } })

  return {
    async findEmployee(phone) {
      const { data } = await client
        .from('employees')
        .select('*')
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
