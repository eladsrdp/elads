// מסלולי אימות: בקשת OTP, אימות, יציאה, מי-אני.
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Me } from '@priority-lite/shared'
import { requestOtp, verifyOtp } from '../auth/otp'
import {
  SESSION_COOKIE,
  SESSION_TTL_SEC,
  createSessionToken,
  verifySessionToken,
} from '../auth/session'
import type { AppContext } from '../context'
import { isProd } from '../env'

const HEBREW_ERRORS: Record<string, string> = {
  invalid_phone: 'מספר טלפון לא תקין',
  not_registered: 'המספר אינו רשום במערכת — פנה למנהל',
  rate_limited: 'יותר מדי בקשות קוד — נסה שוב בעוד כמה דקות',
  no_code: 'לא נשלח קוד למספר הזה — בקש קוד חדש',
  expired: 'הקוד פג תוקף — בקש קוד חדש',
  too_many_attempts: 'יותר מדי ניסיונות — בקש קוד חדש',
  wrong_code: 'קוד שגוי',
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  return `${user.slice(0, 1)}***@${domain}`
}

export function createAuthRoutes(ctx: AppContext) {
  const app = new Hono()

  app.post('/request-otp', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const phone = typeof body.phone === 'string' ? body.phone : ''
    const result = requestOtp(ctx.db, phone)
    if (!result.ok) {
      return c.json({ error: HEBREW_ERRORS[result.error] }, result.error === 'rate_limited' ? 429 : 400)
    }
    await ctx.email.sendOtp(result.employee.email, result.employee.name, result.code)
    // הקוד עצמו לעולם לא חוזר בתשובה — רק רמז לאן נשלח
    return c.json({ ok: true, emailHint: maskEmail(result.employee.email) })
  })

  app.post('/verify-otp', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const phone = typeof body.phone === 'string' ? body.phone : ''
    const code = typeof body.code === 'string' ? body.code : ''
    const result = verifyOtp(ctx.db, phone, code)
    if (!result.ok) return c.json({ error: HEBREW_ERRORS[result.error] }, 400)

    const me: Me = {
      phone: result.employee.phone,
      name: result.employee.name,
      priorityEmpId: result.employee.priority_emp_id,
    }
    const token = await createSessionToken(me, ctx.env.SESSION_SECRET)
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'Lax',
      path: '/',
      maxAge: SESSION_TTL_SEC,
    })
    return c.json(me)
  })

  app.post('/logout', (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: '/' })
    return c.json({ ok: true })
  })

  app.get('/me', async (c) => {
    const token = getCookie(c, SESSION_COOKIE)
    const me = token ? await verifySessionToken(token, ctx.env.SESSION_SECRET) : null
    if (!me) return c.json({ error: 'נדרשת התחברות' }, 401)
    return c.json(me)
  })

  return app
}
