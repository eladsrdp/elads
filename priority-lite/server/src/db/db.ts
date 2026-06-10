// Supabase client — replaces better-sqlite3. All functions are async.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type DB = SupabaseClient

export function createDb(url: string, serviceKey: string): DB {
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

export interface EmployeeRow {
  phone: string
  email: string
  priority_emp_id: string
  name: string
  active: boolean
}

export async function findEmployee(db: DB, phone: string): Promise<EmployeeRow | undefined> {
  const { data } = await db
    .from('employees')
    .select('*')
    .eq('phone', phone)
    .eq('active', true)
    .maybeSingle()
  return data ?? undefined
}

export async function upsertEmployee(
  db: DB,
  e: { phone: string; email: string; priorityEmpId: string; name: string; active?: boolean },
): Promise<void> {
  const { error } = await db.from('employees').upsert({
    phone: e.phone,
    email: e.email,
    priority_emp_id: e.priorityEmpId,
    name: e.name,
    active: e.active !== false,
  })
  if (error) throw new Error(`upsertEmployee failed: ${error.message}`)
}
