// hachamama-parenting-program/mentor-dashboard/src/lib/auth-card-styles.ts
// סטיילים משותפים למסכי "כרטיס בודד" (login, reset-password, מנחה חדשה) —
// המבנה הופיע לראשונה ב-video-submit/page.tsx; הוצא לכאן כדי לא לשכפל שוב בכל מסך חדש.
import { BRAND, FONT_FAMILY } from './brand'

export const authCardStyles = {
  body: {
    fontFamily: FONT_FAMILY,
    background: BRAND.paper,
    color: BRAND.greenDark,
    minHeight: '100vh',
    margin: 0,
    padding: '48px 16px',
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    background: BRAND.white,
    borderRadius: 16,
    boxShadow: '0 2px 12px rgba(47, 95, 71, 0.12)',
    padding: '32px 24px',
    maxWidth: 360,
    width: '100%',
    textAlign: 'center' as const,
  },
  logo: { width: '100%', maxWidth: 220, height: 'auto', marginBottom: 16 },
  h1: { fontSize: 20, margin: '0 0 16px', color: BRAND.greenDark },
  tagline: { fontSize: 13, color: BRAND.greenMuted, margin: '0 0 20px' },
  label: { display: 'block', textAlign: 'right' as const, fontSize: 14, margin: '16px 0 6px', color: BRAND.greenDark },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${BRAND.greenMuted}`,
    borderRadius: 10,
    fontSize: 15,
    background: BRAND.paper,
    boxSizing: 'border-box' as const,
  },
  button: {
    width: '100%',
    marginTop: 24,
    padding: 12,
    background: BRAND.greenDark,
    color: BRAND.white,
    border: 'none',
    borderRadius: 10,
    fontSize: 16,
    cursor: 'pointer',
  },
  helperText: { fontSize: 13, color: BRAND.greenMuted, margin: '0 0 12px' },
  errorText: { color: BRAND.copper, fontSize: 14, marginTop: 12 },
  successText: { color: BRAND.greenDark, fontSize: 14, marginTop: 12 },
} as const
