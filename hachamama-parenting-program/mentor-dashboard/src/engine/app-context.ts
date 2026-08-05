// חיווט יחיד, טעון פעם אחת, ל-db/makeClient/videoStorage שה-Route Handlers/Server
// Actions משתמשים בהם — מקביל למה ש-server/api/index.ts עשה בעצמו קודם.
import { createDb } from './repository/db'
import { createMakeClient } from './make/client'
import { createSupabaseVideoStorage, createFakeVideoStorage } from './storage/video-storage'
import type { VideoStorage } from './storage/video-storage'
import { engineEnv } from './env'
import type { AppDB } from './repository/interface'
import type { MakeClient } from './make/client'

let dbPromise: Promise<AppDB> | null = null
export function getDb(): Promise<AppDB> {
  if (!dbPromise) dbPromise = createDb(engineEnv.SUPABASE_URL, engineEnv.SUPABASE_SERVICE_KEY)
  return dbPromise
}

let makeClientInstance: MakeClient | null = null
export function getMakeClient(): MakeClient {
  if (!makeClientInstance) makeClientInstance = createMakeClient(engineEnv.MAKE_WEBHOOK_URL ?? '')
  return makeClientInstance
}

let videoStorageInstance: VideoStorage | null = null
export function getVideoStorage(): VideoStorage {
  if (!videoStorageInstance) {
    videoStorageInstance =
      engineEnv.SUPABASE_URL && engineEnv.SUPABASE_SERVICE_KEY
        ? createSupabaseVideoStorage(engineEnv.SUPABASE_URL, engineEnv.SUPABASE_SERVICE_KEY)
        : createFakeVideoStorage()
  }
  return videoStorageInstance
}
