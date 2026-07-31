import { serve } from '@hono/node-server'
import { createApp } from './app'
import { env } from './env'
import { createMakeClient } from './make/client'
import { createDb } from './repository/db'

const db = await createDb(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
const makeClient = createMakeClient(env.MAKE_WEBHOOK_URL ?? '')

const app = createApp({ db, makeClient, env })

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`🚀 Hachamama server — http://localhost:${info.port}`)
})
