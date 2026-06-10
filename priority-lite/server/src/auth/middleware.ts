// Middleware שדורש session תקף ומציב את המשתמש על ה-context.
import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import type { Me } from '@priority-lite/shared'
import { SESSION_COOKIE, verifySessionToken } from './session'

export type AuthVars = { Variables: { me: Me } }

export function authRequired(secret: string) {
  return createMiddleware<AuthVars>(async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE)
    const me = token ? await verifySessionToken(token, secret) : null
    if (!me) return c.json({ error: 'נדרשת התחברות' }, 401)
    c.set('me', me)
    await next()
  })
}
