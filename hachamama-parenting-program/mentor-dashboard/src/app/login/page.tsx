// hachamama-parenting-program/mentor-dashboard/src/app/login/page.tsx
import { signIn } from './actions'
import { LOGO_URL } from '@/lib/brand'
import { authCardStyles } from '@/lib/auth-card-styles'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <div style={authCardStyles.body}>
      <div style={authCardStyles.card}>
        <img style={authCardStyles.logo} src={LOGO_URL} alt="החממה" />
        <h1 style={authCardStyles.h1}>כניסת מנחות</h1>
        <form action={signIn}>
          <label style={authCardStyles.label}>
            אימייל
            <input style={authCardStyles.input} name="email" type="email" required />
          </label>
          <label style={authCardStyles.label}>
            סיסמה
            <input style={authCardStyles.input} name="password" type="password" required />
          </label>
          <button style={authCardStyles.button} type="submit">
            התחברות
          </button>
        </form>
        {error === 'invalid-credentials' && <p style={authCardStyles.errorText}>אימייל או סיסמה שגויים</p>}
        {error === 'missing-fields' && <p style={authCardStyles.errorText}>יש למלא אימייל וסיסמה</p>}
      </div>
    </div>
  )
}
