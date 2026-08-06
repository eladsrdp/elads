// נקודת הכניסה המקומית — מרימה שרת Node עם DB אמיתי/זיכרון לפי env.
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { existsSync } from 'node:fs'
import { createApp } from './app'
import { createDb } from './db/db'
import { env, isProd } from './env'

const db = createDb(env.DATABASE_URL, env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
const app = createApp({ db, env })

const clientDist = '../client/dist'
if (isProd && existsSync(clientDist)) {
  app.use('*', serveStatic({ root: clientDist }))
  app.get('*', serveStatic({ path: `${clientDist}/index.html` }))
}

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`🚀 Make Issues server — http://localhost:${info.port}`)
})
