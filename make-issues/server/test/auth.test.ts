// בדיקות ל-/api/auth: login, refresh (עם רוטציה), logout, me, ורייט-לימיט.
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryDb } from '../src/db/memory-impl'
import { hashPassword } from '../src/auth/password'
import { createAuthRoutes } from '../src/routes/auth'
import type { AppContext } from '../src/context'
import { env } from '../src/env'
import type { AppDB } from '../src/db/interface'

let db: AppDB
let ctx: AppContext

function getCookieValue(res: Response, name: string): string | undefined {
  const raw = res.headers.get('set-cookie') ?? ''
  const match = raw.match(new RegExp(`${name}=([^;]+)`))
  return match?.[1]
}

beforeEach(async () => {
  db = createMemoryDb([
    { id: 'u1', username: 'elad', passwordHash: await hashPassword('secret123'), refreshTokenHash: null },
  ])
  ctx = { db, env: { ...env, JWT_SECRET: 'test-jwt-secret' } }
})

describe('POST /login', () => {
  it('מצליח עם שם משתמש וסיסמה נכונים, מחזיר username ומגדיר שני cookies', async () => {
    const app = createAuthRoutes(ctx)
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'elad', password: 'secret123' }),
    })
    expect(res.status).toBe(200)
    expect((await res.json()) as { username: string }).toEqual({ username: 'elad' })
    const setCookies = res.headers.get('set-cookie') ?? ''
    expect(setCookies).toContain('mi_access=')
  })

  it('401 עם סיסמה שגויה, ורושם ניסיון כושל', async () => {
    const app = createAuthRoutes(ctx)
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'elad', password: 'wrong' }),
    })
    expect(res.status).toBe(401)
    expect(await db.countRecentFailedAttempts('elad', new Date(Date.now() - 1000))).toBe(1)
  })

  it('401 למשתמש לא קיים', async () => {
    const app = createAuthRoutes(ctx)
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nobody', password: 'x' }),
    })
    expect(res.status).toBe(401)
  })

  it('429 אחרי חריגה ממכסת הניסיונות הכושלים', async () => {
    const app = createAuthRoutes(ctx)
    for (let i = 0; i < 5; i++) {
      await app.request('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'elad', password: 'wrong' }),
      })
    }
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'elad', password: 'secret123' }),
    })
    expect(res.status).toBe(429)
  })
})

describe('POST /refresh', () => {
  it('מנפיק access token חדש ומסובב את ה-refresh token', async () => {
    const app = createAuthRoutes(ctx)
    const loginRes = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'elad', password: 'secret123' }),
    })
    const refreshCookie = getCookieValue(loginRes, 'mi_refresh')
    expect(refreshCookie).toBeTruthy()

    const refreshRes = await app.request('/refresh', {
      method: 'POST',
      headers: { Cookie: `mi_refresh=${refreshCookie}` },
    })
    expect(refreshRes.status).toBe(200)
    const newRefreshCookie = getCookieValue(refreshRes, 'mi_refresh')
    expect(newRefreshCookie).toBeTruthy()
    expect(newRefreshCookie).not.toBe(refreshCookie)

    // הטוקן הישן כבר לא תקף אחרי הרוטציה
    const reuseRes = await app.request('/refresh', {
      method: 'POST',
      headers: { Cookie: `mi_refresh=${refreshCookie}` },
    })
    expect(reuseRes.status).toBe(401)
  })

  it('401 בלי refresh cookie', async () => {
    const app = createAuthRoutes(ctx)
    const res = await app.request('/refresh', { method: 'POST' })
    expect(res.status).toBe(401)
  })
})

describe('POST /logout', () => {
  it('מנקה את ה-refresh token מה-DB', async () => {
    const app = createAuthRoutes(ctx)
    const loginRes = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'elad', password: 'secret123' }),
    })
    const refreshCookie = getCookieValue(loginRes, 'mi_refresh')

    await app.request('/logout', { method: 'POST', headers: { Cookie: `mi_refresh=${refreshCookie}` } })
    expect((await db.findUserById('u1'))?.refreshTokenHash).toBeNull()
  })

  it('cookie מזויף (userId אמיתי + secret שגוי) לא מנקה את ה-refresh token האמיתי', async () => {
    const app = createAuthRoutes(ctx)
    await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'elad', password: 'secret123' }),
    })
    const hashAfterLogin = (await db.findUserById('u1'))?.refreshTokenHash
    expect(hashAfterLogin).toBeTruthy()

    const forgedCookie = 'u1.wrong-secret-value'
    const res = await app.request('/logout', { method: 'POST', headers: { Cookie: `mi_refresh=${forgedCookie}` } })
    expect(res.status).toBe(200)
    expect((await db.findUserById('u1'))?.refreshTokenHash).toBe(hashAfterLogin)
  })
})

describe('GET /me', () => {
  it('401 בלי access cookie תקף', async () => {
    const app = createAuthRoutes(ctx)
    const res = await app.request('/me')
    expect(res.status).toBe(401)
  })

  it('מחזיר username עם access cookie תקף', async () => {
    const app = createAuthRoutes(ctx)
    const loginRes = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'elad', password: 'secret123' }),
    })
    const accessCookie = getCookieValue(loginRes, 'mi_access')
    const res = await app.request('/me', { headers: { Cookie: `mi_access=${accessCookie}` } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ username: 'elad' })
  })

  it('401 עם access token מזויף (חתימה לא תקינה)', async () => {
    const app = createAuthRoutes(ctx)
    const res = await app.request('/me', { headers: { Cookie: 'mi_access=a.b.c' } })
    expect(res.status).toBe(401)
  })
})

describe('POST /login — cookies מאובטחים בפרודקשן', () => {
  it('מגדיר Secure ב-set-cookie כש-NODE_ENV=production', async () => {
    const prodCtx: AppContext = { db, env: { ...env, JWT_SECRET: 'test-jwt-secret', NODE_ENV: 'production' } }
    const app = createAuthRoutes(prodCtx)
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'elad', password: 'secret123' }),
    })
    expect(res.status).toBe(200)
    const setCookies = res.headers.get('set-cookie') ?? ''
    expect(setCookies).toContain('Secure')
  })
})
