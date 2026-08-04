// התלויות של האפליקציה — מוזרקות כדי שבדיקות יוכלו להחליף כל חלק.
import type { AppDB } from './repository/interface.js'
import type { Env } from './env.js'
import type { MakeClient } from './make/client.js'
import type { VideoStorage } from './storage/video-storage.js'

export interface AppContext {
  db: AppDB
  makeClient: MakeClient
  videoStorage: VideoStorage
  env: Env
}
