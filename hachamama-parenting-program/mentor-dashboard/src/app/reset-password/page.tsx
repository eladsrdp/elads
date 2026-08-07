// hachamama-parenting-program/mentor-dashboard/src/app/reset-password/page.tsx
import { updatePassword } from './actions'

const ERROR_MESSAGES: Record<string, string> = {
  'too-short': 'הסיסמה חייבת להיות באורך 6 תווים לפחות',
  'update-failed': 'עדכון הסיסמה נכשל — נסי לבקש קישור איפוס חדש',
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <main style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>קביעת סיסמה חדשה</h1>
      <form action={updatePassword}>
        <label>
          סיסמה חדשה
          <input name="password" type="password" required minLength={6} style={{ display: 'block', width: '100%', marginBottom: 12 }} />
        </label>
        <button type="submit">שמור סיסמה</button>
      </form>
      {error && <p style={{ color: 'red' }}>{ERROR_MESSAGES[error] ?? 'שגיאה'}</p>}
    </main>
  )
}
