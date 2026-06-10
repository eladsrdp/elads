// נקודת הכניסה — מרכיב תלויות אמיתיות לפי ה-env ומרים את השרת.
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { existsSync } from 'node:fs'
import { createApp } from './app'
import { createDb } from './db/db'
import { createConsoleSender, createResendSender } from './email/sender'
import { env, isProd } from './env'
import { createMockAdapter } from './priority/mock'
import { createODataAdapter } from './priority/odata'

const db = createDb(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

const adapter =
  env.PRIORITY_MODE === 'real'
    ? createODataAdapter({
        baseUrl: env.PRIORITY_BASE_URL ?? '',
        tabulaIni: env.PRIORITY_TABULA_INI,
        company: env.PRIORITY_COMPANY ?? '',
        user: env.PRIORITY_USER ?? '',
        password: env.PRIORITY_PASSWORD ?? '',
      })
    : createMockAdapter({ failRate: env.MOCK_FAIL_RATE })

const email =
  env.EMAIL_MODE === 'resend' && env.RESEND_API_KEY
    ? createResendSender(env.RESEND_API_KEY, env.OTP_FROM_EMAIL)
    : createConsoleSender()

const app = createApp({ db, adapter, email, env })

// בפרודקשן בלבד: שירות יחיד שמגיש גם את הקליינט הבנוי.
// בפיתוח Vite מגיש את הקליינט — הגשת dist ישן כאן רק מבלבלת.
const clientDist = '../client/dist'
if (isProd && existsSync(clientDist)) {
  app.use('*', serveStatic({ root: clientDist }))
  app.get('*', serveStatic({ path: `${clientDist}/index.html` }))
}

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(
    `🚀 Priority Lite server — http://localhost:${info.port} ` +
      `(priority=${env.PRIORITY_MODE}, email=${env.EMAIL_MODE})`,
  )
})
