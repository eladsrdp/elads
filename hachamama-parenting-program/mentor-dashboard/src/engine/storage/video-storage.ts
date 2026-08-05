// hachamama-parenting-program/mentor-dashboard/src/engine/storage/video-storage.ts
// אחסון סרטוני הגשה — Supabase Storage אמיתי בפרודקשן, fake test double בבדיקות
// (אין local-impl בסגנון AppDB כאן כי אין דרך פשוטה "לדמות" אחסון קבצים מקומי;
// ה-fake רק רושם מה הועלה, כמו FakeMakeClient).
import { createClient } from '@supabase/supabase-js'

export interface VideoStorage {
  upload(bytes: Uint8Array, filename: string, contentType: string): Promise<string>
}

export function createSupabaseVideoStorage(supabaseUrl: string, serviceKey: string): VideoStorage {
  // SECURITY: serviceKey חייב להגיע מ-env var (SUPABASE_SERVICE_ROLE_KEY) ולא להיות מוטבע בקוד.
  const supabase = createClient(supabaseUrl, serviceKey)
  return {
    async upload(bytes, filename, contentType) {
      const path = `video-submissions/${crypto.randomUUID()}-${filename}`
      const { error } = await supabase.storage.from('media').upload(path, bytes, { contentType })
      if (error) throw error
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      return data.publicUrl
    },
  }
}

export interface FakeVideoStorage extends VideoStorage {
  uploaded: Array<{ filename: string; contentType: string; bytes: Uint8Array }>
}

export function createFakeVideoStorage(): FakeVideoStorage {
  const uploaded: FakeVideoStorage['uploaded'] = []
  return {
    uploaded,
    async upload(bytes, filename, contentType) {
      uploaded.push({ filename, contentType, bytes })
      return `https://fake-storage.test/${filename}`
    },
  }
}
