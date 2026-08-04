import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { env } from './env.js'
import { createMakeClient } from './make/client.js'
import { createDb } from './repository/db.js'
import { createFakeVideoStorage, createSupabaseVideoStorage } from './storage/video-storage.js'

const db = await createDb(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
const makeClient = createMakeClient(env.MAKE_WEBHOOK_URL ?? '')
const videoStorage =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY
    ? createSupabaseVideoStorage(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
    : createFakeVideoStorage()

const app = createApp({ db, makeClient, videoStorage, env })

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`🚀 Hachamama server — http://localhost:${info.port}`)
})
