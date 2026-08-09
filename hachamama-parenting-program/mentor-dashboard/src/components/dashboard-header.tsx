// hachamama-parenting-program/mentor-dashboard/src/components/dashboard-header.tsx
// Header משותף לכל מסכי המנחות המחוברות (נרשמים/פעילות/תכנים/מנחה חדשה) — מחליף
// header שהיה משוכפל בין participants/page.tsx ל-content/page.tsx, ומוסיף ניווט עקבי גם ל-mentors/new+activity.
import Link from 'next/link'
import { signOut } from '@/app/login/actions'
import { BRAND, LOGO_URL, buttonSecondaryStyle } from '@/lib/brand'

const NAV_ITEMS = [
  { key: 'participants', href: '/participants', label: 'נרשמים' },
  { key: 'activity', href: '/activity', label: 'פעילות' },
  { key: 'content', href: '/content', label: 'תכנים' },
  { key: 'mentors', href: '/mentors/new', label: 'מנחה חדשה' },
] as const

export function DashboardHeader({ active }: { active: 'participants' | 'activity' | 'content' | 'mentors' }) {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        background: BRAND.white,
        borderBottom: `3px solid ${BRAND.greenDark}`,
        marginBottom: 24,
      }}
    >
      <img src={LOGO_URL} alt="החממה" style={{ height: 36 }} />
      <nav style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            style={{
              color: active === item.key ? BRAND.greenDark : BRAND.greenMuted,
              fontWeight: active === item.key ? 600 : 400,
              textDecoration: 'none',
              fontSize: 15,
            }}
          >
            {item.label}
          </Link>
        ))}
        <form action={signOut}>
          <button type="submit" style={buttonSecondaryStyle}>
            התנתקות
          </button>
        </form>
      </nav>
    </header>
  )
}
