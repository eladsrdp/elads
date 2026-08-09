// hachamama-parenting-program/mentor-dashboard/src/app/video-submit/page.tsx
// עיצוב לפי brand/brand-guidelines.md — כרטיס+לוגו+צבעים משותפים עם שאר האפליקציה
// (src/lib/brand.ts, src/lib/auth-card-styles.ts). מקביל ל-server/src/routes/video-submission.ts (Hono HTML).
'use client'

import { useState } from 'react'
import { submitVideo } from './actions'
import { LOGO_URL } from '@/lib/brand'
import { authCardStyles } from '@/lib/auth-card-styles'

const iconStyle = { fontSize: 40, marginBottom: 8 }

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
    <div style={authCardStyles.body}>
      <div style={authCardStyles.card}>
        <img style={authCardStyles.logo} src={LOGO_URL} alt="החממה" />
        {result?.ok ? (
          <>
            <div style={iconStyle}>🌱</div>
            <h1 style={authCardStyles.h1}>התקבל בהצלחה!</h1>
            <p style={authCardStyles.successText}>הסרטון שלך הועלה. תודה ששלחת!</p>
          </>
        ) : (
          <>
            <h1 style={authCardStyles.h1}>העלאת סרטון</h1>
            <p style={authCardStyles.tagline}>הדרך לגדול עם שרה גוטליב</p>
            <form action={handleSubmit}>
              <label style={authCardStyles.label} htmlFor="phone">
                מספר טלפון
              </label>
              <input style={authCardStyles.input} type="tel" id="phone" name="phone" placeholder="050-1234567" required />
              <label style={authCardStyles.label} htmlFor="video">
                קובץ סרטון
              </label>
              <input style={authCardStyles.input} type="file" id="video" name="video" accept="video/*" required />
              <button style={authCardStyles.button} type="submit" disabled={submitting}>
                {submitting ? 'שולח...' : 'שלח'}
              </button>
            </form>
            {result && !result.ok && <p style={authCardStyles.errorText}>{result.error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
