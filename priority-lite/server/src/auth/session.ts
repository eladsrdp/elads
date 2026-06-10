// Session = JWT חתום ב-cookie ‏(httpOnly). stateless — אין טבלת sessions.
import { SignJWT, jwtVerify } from 'jose'
import type { Me } from '@priority-lite/shared'

const ALG = 'HS256'
export const SESSION_COOKIE = 'pl_session'
export const SESSION_TTL_SEC = 7 * 24 * 60 * 60 // 7 ימים (החלטת המשתמש, 2026-06-10)

export async function createSessionToken(me: Me, secret: string): Promise<string> {
  return new SignJWT({ ...me })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(new TextEncoder().encode(secret))
}

export async function verifySessionToken(token: string, secret: string): Promise<Me | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    const { phone, name, priorityEmpId } = payload as Record<string, unknown>
    if (typeof phone !== 'string' || typeof name !== 'string' || typeof priorityEmpId !== 'string') {
      return null
    }
    return { phone, name, priorityEmpId }
  } catch {
    return null
  }
}
