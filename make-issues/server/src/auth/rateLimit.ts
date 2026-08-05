// חסימת ניסיונות login חוזרים — נבדק מול login_attempts ב-DB, לא בזיכרון-תהליך
// (Vercel serverless functions הן חסרות מצב בין הרצות — זיכרון-תהליך לא היה עובד).
import type { AppDB } from '../db/interface'

export const LOGIN_WINDOW_MS = 15 * 60 * 1000 // 15 דקות
export const LOGIN_MAX_ATTEMPTS = 5

export async function isLoginRateLimited(db: AppDB, username: string): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS)
  const failures = await db.countRecentFailedAttempts(username, since)
  return failures >= LOGIN_MAX_ATTEMPTS
}
