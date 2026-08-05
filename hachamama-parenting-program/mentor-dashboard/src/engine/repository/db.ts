// Factory: Supabase אם URL+key מוגדרים, אחרת local (in-memory).
// import דינמי ל-supabase-impl כדי שסביבת בדיקות בלי Supabase לא תצטרך לטעון אותו כלל.
import type { AppDB } from './interface.js'
import { createLocalDb } from './local-impl.js'

export async function createDb(supabaseUrl?: string, supabaseKey?: string): Promise<AppDB> {
  if (supabaseUrl && supabaseKey) {
    const { createSupabaseDb } = await import('./supabase-impl.js')
    return createSupabaseDb(supabaseUrl, supabaseKey)
  }
  console.log('[db] Supabase לא מוגדר — משתמש ב-local DB (in-memory)')
  return createLocalDb()
}
