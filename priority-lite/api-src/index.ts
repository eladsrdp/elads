// Vercel serverless entry point — wraps the Hono app for deployment.
import { getRequestListener } from '@hono/node-server'
import { createApp } from '../server/src/app'
import { createDb } from '../server/src/db/db'
import { createConsoleSender, createResendSender } from '../server/src/email/sender'
import { env } from '../server/src/env'
import { createMockAdapter } from '../server/src/priority/mock'
import { createODataAdapter } from '../server/src/priority/odata'

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

// Named export forces esbuild CJS wrapper to generate exports.default + module.exports = __toCommonJS(...)
// The vercel-build.mjs footer then sets module.exports = exports.default (the callable handler).
export const handler = getRequestListener(app)
export default handler
