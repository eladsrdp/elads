// בוחר Neon (DATABASE_URL) אם קיים, אחרת Supabase אם יש credentials, אחרת DB מקומי מבוסס-קובץ.
import type { AppDB } from './interface'
import { createLocalDb } from './local-impl'
import { createNeonDb } from './neon-impl'
import { createSupabaseDb } from './supabase-impl'

// יחסי לתיקיית העבודה שממנה מריצים את השרת (server/) — גם ב-dev וגם דרך seed.ts,
// כדי ששניהם יצביעו לאותו קובץ בפועל.
export const LOCAL_DB_PATH = './data/local-db.json'

export function createDb(
  databaseUrl: string | undefined,
  supabaseUrl: string | undefined,
  supabaseServiceKey: string | undefined,
): AppDB {
  if (databaseUrl) return createNeonDb(databaseUrl)
  if (supabaseUrl && supabaseServiceKey) return createSupabaseDb(supabaseUrl, supabaseServiceKey)
  return createLocalDb(LOCAL_DB_PATH)
}
