// Factory: Supabase אם URL מוגדר, אחרת local (in-memory + whitelist.json).
export type { AppDB, EmployeeRow, OtpRow } from './interface'
import type { AppDB } from './interface'
import { createLocalDb } from './local-impl'
import { createSupabaseDb } from './supabase-impl'

export function createDb(supabaseUrl?: string, supabaseKey?: string): AppDB {
  if (supabaseUrl && supabaseKey) {
    return createSupabaseDb(supabaseUrl, supabaseKey)
  }
  console.log('[db] Supabase לא מוגדר — משתמש ב-local DB (whitelist.json + in-memory OTP)')
  return createLocalDb()
}
