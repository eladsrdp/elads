// מאמת את ה-secret המשותף עם Make.com בהדר Authorization, בהשוואת-זמן-קבוע.
import type { Context, Next } from 'hono'
import { timingSafeEqual } from 'node:crypto'

// SECURITY: השוואה בזמן-קבוע (constant-time) כדי למנוע timing attack שיאפשר
// לתקוף את ה-secret בית-אחר-בית. אין לפשט את זה ל-'==='.
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

export function requireWebhookSecret(secret: string) {
  return async (c: Context, next: Next) => {
    const header = c.req.header('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token || !safeEqual(token, secret)) {
      return c.json({ error: 'לא מורשה' }, 401)
    }
    await next()
  }
}
