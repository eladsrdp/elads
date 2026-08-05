// Middleware שדורש access token תקף ומציב את שם המשתמש על ה-context.
import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { ACCESS_TOKEN_COOKIE, verifyAccessToken } from './tokens'

export type AuthVars = { Variables: { username: string } }

export function requireAuth(secret: string) {
  return createMiddleware<AuthVars>(async (c, next) => {
    const token = getCookie(c, ACCESS_TOKEN_COOKIE)
    const username = token ? await verifyAccessToken(token, secret) : null
    if (!username) return c.json({ error: 'נדרשת התחברות' }, 401)
    c.set('username', username)
    await next()
  })
}
