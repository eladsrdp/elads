// hachamama-parenting-program/mentor-dashboard/src/app/login/page.tsx
import { signIn } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <main style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>כניסת מנחות</h1>
      <form action={signIn}>
        <label>
          אימייל
          <input name="email" type="email" required style={{ display: 'block', width: '100%', marginBottom: 12 }} />
        </label>
        <label>
          סיסמה
          <input name="password" type="password" required style={{ display: 'block', width: '100%', marginBottom: 12 }} />
        </label>
        <button type="submit">התחברות</button>
      </form>
      {error === 'invalid-credentials' && <p style={{ color: 'red' }}>אימייל או סיסמה שגויים</p>}
      {error === 'missing-fields' && <p style={{ color: 'red' }}>יש למלא אימייל וסיסמה</p>}
    </main>
  )
}
