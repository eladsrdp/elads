// hachamama-parenting-program/mentor-dashboard/src/lib/brand.ts
// טוקני מיתוג "החממה" — מקור אחד לצבעים+לוגו לכל האפליקציה (dashboard + video-submit).
// ה-HEX נדגם בפיקסלים מתוך brand/logo.png, ראו hachamama-parenting-program/brand/brand-guidelines.md.
export const LOGO_URL = 'https://lqhpfrhiiboshsoqnfdz.supabase.co/storage/v1/object/public/media/branding/logo-full.jpg'

export const BRAND = {
  greenDark: '#2F5F47',
  greenMuted: '#789084',
  copper: '#8B481C',
  paper: '#F3F3F3',
  white: '#FFFFFF',
  border: 'rgba(120, 144, 132, 0.3)', // גרסה שקופה של greenMuted, למסגרות עדינות בטבלאות
} as const

// Rubik+Assistant נטענים ב-root layout.tsx (Google Fonts stylesheet); הפולבקים נשארים
// כרשת ביטחון אם הטעינה איטית/נכשלת.
export const FONT_FAMILY = '"Rubik", "Assistant", -apple-system, "Segoe UI", Arial, sans-serif'

export const pageWrapperStyle = {
  maxWidth: 900,
  margin: '0 auto 40px',
  padding: '0 24px',
  fontFamily: FONT_FAMILY,
} as const

export const buttonPrimaryStyle = {
  padding: '8px 16px',
  background: BRAND.greenDark,
  color: BRAND.white,
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  cursor: 'pointer',
} as const

export const buttonSecondaryStyle = {
  padding: '6px 14px',
  background: 'transparent',
  color: BRAND.greenMuted,
  border: `1px solid ${BRAND.greenMuted}`,
  borderRadius: 8,
  fontSize: 14,
  cursor: 'pointer',
} as const

export const buttonDangerStyle = {
  padding: '6px 14px',
  background: 'transparent',
  color: BRAND.copper,
  border: `1px solid ${BRAND.copper}`,
  borderRadius: 8,
  fontSize: 14,
  cursor: 'pointer',
} as const
