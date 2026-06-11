// התלויות של האפליקציה — מוזרקות כדי שבדיקות יוכלו להחליף כל חלק.
import type { AppDB } from './db/db'
import type { EmailSender } from './email/sender'
import type { Env } from './env'
import type { PriorityAdapter } from './priority/adapter'

export interface AppContext {
  db: AppDB
  adapter: PriorityAdapter
  email: EmailSender
  env: Env
}
