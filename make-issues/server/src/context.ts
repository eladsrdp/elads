import type { Env } from './env'
import type { AppDB } from './db/interface'

export interface AppContext {
  db: AppDB
  env: Env
}
