// inbox/src/index.ts
// נקודת הכניסה — מרכיב תלויות אמיתיות לפי ה-env ומרים את השרת.
import { serve } from '@hono/node-server'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createApp } from './app'
import { createDb } from './db'
import { env } from './env'

mkdirSync(dirname(env.DB_PATH), { recursive: true })
const db = createDb(env.DB_PATH)
const app = createApp({ db, selfChatId: env.SELF_CHAT_ID })

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`📥 inbox — http://localhost:${info.port} (self chat: ${env.SELF_CHAT_ID})`)
})
