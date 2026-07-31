// התלויות של האפליקציה — מוזרקות כדי שבדיקות יוכלו להחליף כל חלק.
import type { AppDB } from './repository/interface'
import type { Env } from './env'
import type { MakeClient } from './make/client'

export interface AppContext {
  db: AppDB
  makeClient: MakeClient
  env: Env
}
