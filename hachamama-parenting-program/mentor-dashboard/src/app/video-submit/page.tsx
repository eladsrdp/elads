// עיצוב לפי brand/brand-guidelines.md — פלטה נדגמה בפיקסלים מ-logo.png, לא הערכת עין.
// מקביל ל-server/src/routes/video-submission.ts (Hono HTML) — אותו לוגו/צבעים/מבנה,
// כאן כ-JSX + Server Action במקום form POST + HTML string.
'use client'

import { useState } from 'react'
import { submitVideo } from './actions'

const LOGO_URL = 'https://lqhpfrhiiboshsoqnfdz.supabase.co/storage/v1/object/public/media/branding/logo-full.jpg'
const COLOR_GREEN_DARK = '#2F5F47'
const COLOR_GREEN_MUTED = '#789084'
const COLOR_COPPER = '#8B481C'
const COLOR_PAPER = '#F3F3F3'

const styles = {
  body: {
    fontFamily: '-apple-system, "Segoe UI", Arial, sans-serif',
    background: COLOR_PAPER,
    color: COLOR_GREEN_DARK,
    minHeight: '100vh',
    margin: 0,
    padding: '24px 16px',
    display: 'flex',
    justifyContent: 'center',
    direction: 'rtl' as const,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 2px 12px rgba(47, 95, 71, 0.12)',
    padding: '32px 24px',
    maxWidth: 360,
    width: '100%',
    textAlign: 'center' as const,
  },
  logo: { width: '100%', maxWidth: 280, height: 'auto', marginBottom: 16 },
  h1: { fontSize: 20, margin: '0 0 6px', color: COLOR_GREEN_DARK },
  tagline: { fontSize: 13, color: COLOR_GREEN_MUTED, margin: '0 0 20px' },
  label: { display: 'block', textAlign: 'right' as const, fontSize: 14, margin: '16px 0 6px', color: COLOR_GREEN_DARK },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${COLOR_GREEN_MUTED}`,
    borderRadius: 10,
    fontSize: 15,
    background: COLOR_PAPER,
    boxSizing: 'border-box' as const,
  },
  button: {
    width: '100%',
    marginTop: 24,
    padding: 12,
    background: COLOR_GREEN_DARK,
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 16,
    cursor: 'pointer',
  },
  icon: { fontSize: 40, marginBottom: 8 },
  errorText: { color: COLOR_COPPER, fontSize: 15 },
  successText: { color: COLOR_GREEN_DARK, fontSize: 15 },
}

export default function VideoSubmitPage() {
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setSubmitting(true)
    const outcome = await submitVideo(formData)
    setResult(outcome.ok ? { ok: true } : { ok: false, error: outcome.error })
    setSubmitting(false)
  }

  return (
    <div style={styles.body}>
      <div style={styles.card}>
        <img style={styles.logo} src={LOGO_URL} alt="החממה" />
        {result?.ok ? (
          <>
            <div style={styles.icon}>🌱</div>
            <h1 style={styles.h1}>התקבל בהצלחה!</h1>
            <p style={styles.successText}>הסרטון שלך הועלה. תודה ששלחת!</p>
          </>
        ) : (
          <>
            <h1 style={styles.h1}>העלאת סרטון</h1>
            <p style={styles.tagline}>הדרך לגדול עם שרה גוטליב</p>
            <form action={handleSubmit}>
              <label style={styles.label} htmlFor="phone">
                מספר טלפון
              </label>
              <input style={styles.input} type="tel" id="phone" name="phone" placeholder="050-1234567" required />
              <label style={styles.label} htmlFor="video">
                קובץ סרטון
              </label>
              <input style={styles.input} type="file" id="video" name="video" accept="video/*" required />
              <button style={styles.button} type="submit" disabled={submitting}>
                {submitting ? 'שולח...' : 'שלח'}
              </button>
            </form>
            {result && !result.ok && <p style={styles.errorText}>{result.error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
