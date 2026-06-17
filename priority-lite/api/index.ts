// Vercel serverless entry point — wraps the Hono app for deployment.
import { Hono } from 'hono'
import { toNodeHandler } from '@hono/node-server'
import { createApp } from '../server/src/app'
import { createDb } from '../server/src/db/db'
import { createConsoleSender, createResendSender } from '../server/src/email/sender'
import { env } from '../server/src/env'
import { createMockAdapter } from '../server/src/priority/mock'
import { createODataAdapter } from '../server/src/priority/odata'

// SECURITY: startup errors surface as JSON so we can diagnose — remove after fix
let finalApp: Hono
try {
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

  finalApp = createApp({ db, adapter, email, env })
} catch (err) {
  finalApp = new Hono()
  finalApp.all('*', (c) =>
    c.json(
      {
        ok: false,
        startup_error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack?.split('\n').slice(0, 10) : undefined,
      },
      500,
    ),
  )
}

export default toNodeHandler(finalApp)
