// בוחר Supabase אם יש credentials, אחרת נופל ל-DB בזיכרון (פיתוח מקומי בלבד).
import type { AppDB } from './interface'
import { createMemoryDb } from './memory-impl'
import { createSupabaseDb } from './supabase-impl'

export function createDb(url: string | undefined, serviceKey: string | undefined): AppDB {
  if (url && serviceKey) return createSupabaseDb(url, serviceKey)
  return createMemoryDb()
}
