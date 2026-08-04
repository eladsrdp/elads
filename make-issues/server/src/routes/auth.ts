// /api/auth — login (username+password), refresh (רוטציית refresh token), logout, me.
import { Context, Hono } from 'hono'
import { z } from 'zod'
import { bodyLimit } from 'hono/body-limit'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { AppContext } from '../context'
import { isLoginRateLimited } from '../auth/rateLimit'
import { requireAuth, type AuthVars } from '../auth/middleware'
import { verifyPassword } from '../auth/password'
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SEC,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_SEC,
  createAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  parseRefreshToken,
  verifyRefreshToken,
} from '../auth/tokens'

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) })

// SECURITY: hash בדוי קבוע (bcrypt של מחרוזת אקראית שלעולם לא תתאים לסיסמה אמיתית) —
// משמש להרצת bcrypt.compare גם כשלא נמצא משתמש, כדי שזמן התגובה לא יחשוף אם שם המשתמש קיים.
const DUMMY_HASH = '$2a$12$CwTycUXWue0Thq9StjUM0uJ8iVOxNXWXm7q7c72dOA1E6JHDL5.5S'

export function createAuthRoutes(ctx: AppContext) {
  const app = new Hono<AuthVars>()

  // SECURITY: הגבלת גודל בקשה — שם משתמש/סיסמה קצרים מטבעם, 4KB נדיב יותר מספיק.
  app.use('*', bodyLimit({ maxSize: 4 * 1024, onError: (c) => c.json({ error: 'הבקשה גדולה מדי' }, 413) }))

  const cookieOpts = (maxAgeSec: number) => ({
    httpOnly: true,
    secure: ctx.env.NODE_ENV === 'production',
    sameSite: 'Strict' as const,
    path: '/',
    maxAge: maxAgeSec,
  })

  async function issueSession(c: Context<AuthVars>, userId: string, username: string) {
    const accessToken = await createAccessToken(username, ctx.env.JWT_SECRET)
    const { token: refreshToken, secret } = generateRefreshToken(userId)
    await ctx.db.setRefreshTokenHash(userId, await hashRefreshToken(secret))
    setCookie(c, ACCESS_TOKEN_COOKIE, accessToken, cookieOpts(ACCESS_TOKEN_TTL_SEC))
    setCookie(c, REFRESH_TOKEN_COOKIE, refreshToken, cookieOpts(REFRESH_TOKEN_TTL_SEC))
  }

  app.post('/login', async (c) => {
    const json = await c.req.json().catch(() => null)
    const body = loginSchema.safeParse(json)
    if (!body.success) return c.json({ error: 'שם משתמש וסיסמה נדרשים' }, 400)
    const { username, password } = body.data

    if (await isLoginRateLimited(ctx.db, username)) {
      return c.json({ error: 'יותר מדי ניסיונות — נסה שוב מאוחר יותר' }, 429)
    }

    // SECURITY: תמיד מריצים bcrypt.compare (נגד hash בדוי כשאין משתמש) כדי לנטרל
    // side-channel של תזמון שהיה חושף אילו שמות משתמש קיימים במערכת.
    const user = await ctx.db.findUserByUsername(username)
    const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH)
    const success = !!user && ok
    await ctx.db.recordLoginAttempt(username, success)
    if (!success) return c.json({ error: 'שם משתמש או סיסמה שגויים' }, 401)

    await issueSession(c, user.id, user.username)
    return c.json({ username: user.username })
  })

  app.post('/refresh', async (c) => {
    const raw = getCookie(c, REFRESH_TOKEN_COOKIE)
    const parsed = raw ? parseRefreshToken(raw) : null
    const user = parsed ? await ctx.db.findUserById(parsed.userId) : undefined
    const valid =
      parsed && user?.refreshTokenHash ? await verifyRefreshToken(parsed.secret, user.refreshTokenHash) : false

    if (!parsed || !user || !valid) {
      deleteCookie(c, ACCESS_TOKEN_COOKIE, { path: '/' })
      deleteCookie(c, REFRESH_TOKEN_COOKIE, { path: '/' })
      return c.json({ error: 'נדרשת התחברות' }, 401)
    }

    await issueSession(c, user.id, user.username)
    return c.json({ username: user.username })
  })

  app.post('/logout', async (c) => {
    const raw = getCookie(c, REFRESH_TOKEN_COOKIE)
    const parsed = raw ? parseRefreshToken(raw) : null
    // SECURITY: מאמתים את ה-secret מול ה-hash השמור לפני שנוגעים ב-DB —
    // אחרת cookie מזויף (userId אמיתי + secret כלשהו) יכול לאלץ logout על חשבון של מישהו אחר
    // בלי שום הוכחה שהתוקף אכן מחזיק refresh token תקף.
    const user = parsed ? await ctx.db.findUserById(parsed.userId) : undefined
    if (parsed && user?.refreshTokenHash && (await verifyRefreshToken(parsed.secret, user.refreshTokenHash))) {
      await ctx.db.setRefreshTokenHash(parsed.userId, null)
    }
    deleteCookie(c, ACCESS_TOKEN_COOKIE, { path: '/' })
    deleteCookie(c, REFRESH_TOKEN_COOKIE, { path: '/' })
    return c.json({ ok: true })
  })

  app.get('/me', requireAuth(ctx.env.JWT_SECRET), (c) => {
    return c.json({ username: c.get('username') })
  })

  return app
}
