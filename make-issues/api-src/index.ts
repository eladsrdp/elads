// Vercel serverless entry point — wraps the Hono app for deployment.
import { getRequestListener } from '@hono/node-server'
import { createApp } from '../server/src/app'
import { createDb } from '../server/src/db/db'
import { env } from '../server/src/env'

// SECURITY: not logging env values — only confirming keys exist for debugging
console.log('[boot] JWT_SECRET set:', env.JWT_SECRET !== 'dev-secret-change-me')

const db = createDb(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
const app = createApp({ db, env })

// Named export forces esbuild CJS wrapper to generate exports.default + module.exports = __toCommonJS(...)
// The vercel-build.mjs footer then sets module.exports = exports.default (the callable handler).
export const handler = getRequestListener(app.fetch)
export default handler
