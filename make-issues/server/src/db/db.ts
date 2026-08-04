// בוחר Supabase אם יש credentials, אחרת DB מקומי מבוסס-קובץ (./data/local-db.json).
import type { AppDB } from './interface'
import { createLocalDb } from './local-impl'
import { createSupabaseDb } from './supabase-impl'

// יחסי לתיקיית העבודה שממנה מריצים את השרת (server/) — גם ב-dev וגם דרך seed.ts,
// כדי ששניהם יצביעו לאותו קובץ בפועל.
export const LOCAL_DB_PATH = './data/local-db.json'

export function createDb(url: string | undefined, serviceKey: string | undefined): AppDB {
  if (url && serviceKey) return createSupabaseDb(url, serviceKey)
  return createLocalDb(LOCAL_DB_PATH)
}
