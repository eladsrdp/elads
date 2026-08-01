import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { env } from './env.js'
import { createMakeClient } from './make/client.js'
import { createDb } from './repository/db.js'

const db = await createDb(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
const makeClient = createMakeClient(env.MAKE_WEBHOOK_URL ?? '')

const app = createApp({ db, makeClient, env })

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`🚀 Hachamama server — http://localhost:${info.port}`)
})
