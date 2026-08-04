// Access token: JWT קצר-טווח. Refresh token: userId גלוי + secret אקראי, ה-secret נשמר כ-hash בלבד
// (מאפשר לאתר את המשתמש בלי לחפש hash הפיך, בעוד שה-secret עצמו לא ניתן לניחוש).
import { SignJWT, jwtVerify } from 'jose'
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'

const ALG = 'HS256'
const REFRESH_SALT_ROUNDS = 12

export const ACCESS_TOKEN_COOKIE = 'mi_access'
export const REFRESH_TOKEN_COOKIE = 'mi_refresh'
export const ACCESS_TOKEN_TTL_SEC = 60 * 60 // שעה
export const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60 // 30 יום

export async function createAccessToken(username: string, secret: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SEC}s`)
    .sign(new TextEncoder().encode(secret))
}

export async function verifyAccessToken(token: string, secret: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: [ALG] })
    return typeof payload.username === 'string' ? payload.username : null
  } catch {
    return null
  }
}

export function generateRefreshToken(userId: string): { token: string; secret: string } {
  const secret = randomBytes(32).toString('hex')
  return { token: `${userId}.${secret}`, secret }
}

export function parseRefreshToken(token: string): { userId: string; secret: string } | null {
  const idx = token.indexOf('.')
  if (idx <= 0 || idx === token.length - 1) return null
  return { userId: token.slice(0, idx), secret: token.slice(idx + 1) }
}

export async function hashRefreshToken(secret: string): Promise<string> {
  return bcrypt.hash(secret, REFRESH_SALT_ROUNDS)
}

export async function verifyRefreshToken(secret: string, hash: string): Promise<boolean> {
  return bcrypt.compare(secret, hash)
}
