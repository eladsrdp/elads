// התלויות של האפליקציה — מוזרקות כדי שבדיקות יוכלו להחליף כל חלק.
import type { AppDB } from './repository/interface.js'
import type { Env } from './env.js'
import type { MakeClient } from './make/client.js'

export interface AppContext {
  db: AppDB
  makeClient: MakeClient
  env: Env
}
