// בדיקות לחסימת ניסיונות login חוזרים — DB-backed (לא בזיכרון-תהליך, כדי לעבוד על Vercel serverless).
import { describe, expect, it } from 'vitest'
import { createMemoryDb } from '../src/db/memory-impl'
import { isLoginRateLimited, LOGIN_MAX_ATTEMPTS } from '../src/auth/rateLimit'

describe('isLoginRateLimited', () => {
  it('false כשאין ניסיונות כושלים', async () => {
    const db = createMemoryDb()
    expect(await isLoginRateLimited(db, 'elad')).toBe(false)
  })

  it('true אחרי הגעה למכסת הכשלים', async () => {
    const db = createMemoryDb()
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) {
      await db.recordLoginAttempt('elad', false)
    }
    expect(await isLoginRateLimited(db, 'elad')).toBe(true)
  })

  it('הצלחות לא נספרות בחסימה', async () => {
    const db = createMemoryDb()
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) {
      await db.recordLoginAttempt('elad', true)
    }
    expect(await isLoginRateLimited(db, 'elad')).toBe(false)
  })

  it('משתמש אחר לא מושפע מכשלים של משתמש אחר', async () => {
    const db = createMemoryDb()
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) {
      await db.recordLoginAttempt('elad', false)
    }
    expect(await isLoginRateLimited(db, 'other')).toBe(false)
  })
})
