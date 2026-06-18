// מסלולי אימות: TOTP (Google Authenticator), יציאה, מי-אני.
import { authenticator } from 'otplib'
import { toDataURL } from 'qrcode'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Me } from '@priority-lite/shared'
import { normalizePhone } from '../auth/otp'
import {
  SESSION_COOKIE,
  SESSION_TTL_SEC,
  createSessionToken,
  verifySessionToken,
} from '../auth/session'
import type { AppContext } from '../context'
import { isProd } from '../env'

export function createAuthRoutes(ctx: AppContext) {
  const app = new Hono()

  // שלב 1: בדיקת מספר טלפון.
  // מחזיר { firstTime: true, qrDataUrl } בכניסה ראשונה — המשתמש סורק ומגדיר Authenticator.
  // מחזיר { firstTime: false } בכניסות הבאות — רק קוד נדרש.
  // SECURITY: qrDataUrl נשלח רק בפעם הראשונה ונשמר ב-DB לאחר מכן, לא ב-session.
  app.post('/initiate', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const phone = typeof body.phone === 'string' ? body.phone : ''
    const normalized = normalizePhone(phone)
    if (!normalized) return c.json({ error: 'מספר טלפון לא תקין' }, 400)

    const employee = await ctx.db.findEmployee(normalized)
    if (!employee) return c.json({ error: 'לא זיהינו אותך כעובד RDP — אם טעית במספר, נסה שוב' }, 400)

    if (employee.totp_secret) {
      return c.json({ ok: true, firstTime: false })
    }

    // פעם ראשונה — יוצרים סוד ו-QR
    const secret = authenticator.generateSecret()
    const otpauthUri = authenticator.keyuri(employee.name, 'Priority Lite RDP', secret)
    const qrDataUrl = await toDataURL(otpauthUri)
    await ctx.db.setTotpSecret(normalized, secret)

    return c.json({ ok: true, firstTime: true, qrDataUrl })
  })

  // שלב 2: אימות קוד TOTP מה-Authenticator.
  app.post('/verify', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const phone = typeof body.phone === 'string' ? body.phone : ''
    const code = typeof body.code === 'string' ? body.code.replace(/\s/g, '') : ''
    const normalized = normalizePhone(phone)
    if (!normalized) return c.json({ error: 'מספר טלפון לא תקין' }, 400)

    const employee = await ctx.db.findEmployee(normalized)
    // SECURITY: לא מבחינים בין "לא נמצא" ל"קוד שגוי" — מניעת user enumeration
    if (!employee?.totp_secret) return c.json({ error: 'קוד שגוי' }, 400)

    const isValid = authenticator.verify({ token: code, secret: employee.totp_secret })
    if (!isValid) return c.json({ error: 'קוד שגוי' }, 400)

    const me: Me = {
      phone: employee.phone,
      name: employee.name,
      priorityEmpId: employee.priority_emp_id,
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
