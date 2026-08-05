// בדיקות ל-hashing סיסמאות, access token (JWT), ורצועת refresh token.
import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../src/auth/password'
import {
  ACCESS_TOKEN_TTL_SEC,
  createAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  parseRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../src/auth/tokens'

const SECRET = 'test-secret'

describe('password hashing', () => {
  it('hash שונה מהסיסמה המקורית, ו-verify מזהה נכון/שגוי', async () => {
    const hash = await hashPassword('my-password')
    expect(hash).not.toBe('my-password')
    expect(await verifyPassword('my-password', hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})

describe('access token', () => {
  it('נחתם ומאומת עם אותו secret ומחזיר את שם המשתמש', async () => {
    const token = await createAccessToken('elad', SECRET)
    expect(await verifyAccessToken(token, SECRET)).toBe('elad')
  })

  it('נדחה עם secret שגוי', async () => {
    const token = await createAccessToken('elad', SECRET)
    expect(await verifyAccessToken(token, 'wrong-secret')).toBeNull()
  })

  it('טוקן פגום נדחה בלי לזרוק שגיאה', async () => {
    expect(await verifyAccessToken('not-a-jwt', SECRET)).toBeNull()
  })

  it('ה-TTL הוא שעה אחת', () => {
    expect(ACCESS_TOKEN_TTL_SEC).toBe(3600)
  })
})

describe('refresh token', () => {
  it('מקודד את userId בגלוי ואת ה-secret בנפרד', () => {
    const { token, secret } = generateRefreshToken('user-123')
    const parsed = parseRefreshToken(token)
    expect(parsed?.userId).toBe('user-123')
    expect(parsed?.secret).toBe(secret)
  })

  it('hash/verify מזהים secret נכון/שגוי', async () => {
    const { secret } = generateRefreshToken('user-123')
    const hash = await hashRefreshToken(secret)
    expect(await verifyRefreshToken(secret, hash)).toBe(true)
    expect(await verifyRefreshToken('wrong-secret', hash)).toBe(false)
  })

  it('parseRefreshToken דוחה טוקן בלי נקודה מפרידה', () => {
    expect(parseRefreshToken('no-dot-here')).toBeNull()
  })

  it('parseRefreshToken דוחה טוקן עם secret ריק (נקודה בסוף)', () => {
    expect(parseRefreshToken('user-123.')).toBeNull()
  })
})
