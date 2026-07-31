import { serve } from '@hono/node-server'
import { createApp } from './app'
import { env } from './env'

// @ts-expect-error — הרכבה מלאה עם db/makeClient אמיתיים מגיעה במשימה 12
const app = createApp({ env })

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`🚀 Hachamama server — http://localhost:${info.port}`)
})
