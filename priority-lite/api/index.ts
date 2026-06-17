// Vercel serverless entry point — wraps the Hono app for deployment.
// TEMP: minimal version to diagnose FUNCTION_INVOCATION_FAILED (dynamic imports below)
import { Hono } from 'hono'
import { toNodeHandler } from '@hono/node-server'

const app = new Hono()

app.all('*', async (c) => {
  try {
    const { createApp } = await import('../server/src/app')
    const { createDb } = await import('../server/src/db/db')
    const { createConsoleSender, createResendSender } = await import('../server/src/email/sender')
    const { env } = await import('../server/src/env')
    const { createMockAdapter } = await import('../server/src/priority/mock')
    const { createODataAdapter } = await import('../server/src/priority/odata')

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
    const realApp = createApp({ db, adapter, email, env })
    return realApp.fetch(c.req.raw, { env: {} })
  } catch (err) {
    return c.json(
      {
        ok: false,
        startup_error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack?.split('\n').slice(0, 15) : undefined,
      },
      500,
    )
  }
})

export default toNodeHandler(app)
