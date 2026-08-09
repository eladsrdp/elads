// hachamama-parenting-program/mentor-dashboard/src/app/mentors/new/page.tsx
import { createMentor } from '../actions'
import { DashboardHeader } from '@/components/dashboard-header'
import { authCardStyles } from '@/lib/auth-card-styles'

const ERROR_MESSAGES: Record<string, string> = {
  'missing-fields': 'יש למלא שם, אימייל וטלפון',
  'email-exists': 'כבר קיימת מנחה עם האימייל הזה',
  'create-failed': 'יצירת המנחה נכשלה, נסי שוב',
  'server-misconfigured': 'שגיאת הגדרות שרת — פנה למפתח',
}

export default async function NewMentorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams
  return (
    <>
      <DashboardHeader active="mentors" />
      <div style={authCardStyles.body}>
        <div style={authCardStyles.card}>
          <h1 style={authCardStyles.h1}>מנחה חדשה</h1>
          <p style={authCardStyles.helperText}>סיסמת ההתחברות של המנחה תהיה מספר הטלפון שלה, כפי שמוזן כאן.</p>
          <form action={createMentor}>
            <label style={authCardStyles.label}>
              שם מלא
              <input style={authCardStyles.input} name="fullName" type="text" required />
            </label>
            <label style={authCardStyles.label}>
              אימייל
              <input style={authCardStyles.input} name="email" type="email" required />
            </label>
            <label style={authCardStyles.label}>
              טלפון (יהיה גם הסיסמה)
              <input style={authCardStyles.input} name="phone" type="tel" required />
            </label>
            <button style={authCardStyles.button} type="submit">
              הוסף מנחה
            </button>
          </form>
          {error && <p style={authCardStyles.errorText}>{ERROR_MESSAGES[error] ?? 'שגיאה'}</p>}
          {success && <p style={authCardStyles.successText}>המנחה נוצרה בהצלחה!</p>}
        </div>
      </div>
    </>
  )
}
