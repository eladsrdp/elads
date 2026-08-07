// hachamama-parenting-program/mentor-dashboard/src/app/mentors/new/page.tsx
import Link from 'next/link'
import { createMentor } from '../actions'

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
    <main style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>מנחה חדשה</h1>
      <p style={{ color: '#666', fontSize: 14 }}>
        סיסמת ההתחברות של המנחה תהיה מספר הטלפון שלה, כפי שמוזן כאן.
      </p>
      <form action={createMentor}>
        <label>
          שם מלא
          <input name="fullName" type="text" required style={{ display: 'block', width: '100%', marginBottom: 12 }} />
        </label>
        <label>
          אימייל
          <input name="email" type="email" required style={{ display: 'block', width: '100%', marginBottom: 12 }} />
        </label>
        <label>
          טלפון (יהיה גם הסיסמה)
          <input name="phone" type="tel" required style={{ display: 'block', width: '100%', marginBottom: 12 }} />
        </label>
        <button type="submit">הוסף מנחה</button>
      </form>
      {error && <p style={{ color: 'red' }}>{ERROR_MESSAGES[error] ?? 'שגיאה'}</p>}
      {success && <p style={{ color: 'green' }}>המנחה נוצרה בהצלחה!</p>}
      <p style={{ marginTop: 24 }}>
        <Link href="/participants">← חזרה לנרשמים</Link>
      </p>
    </main>
  )
}
