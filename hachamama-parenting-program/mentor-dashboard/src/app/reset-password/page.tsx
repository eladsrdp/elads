// hachamama-parenting-program/mentor-dashboard/src/app/reset-password/page.tsx
// לקוח-בלבד בכוונה: קישור איפוס הסיסמה של Supabase יכול להגיע עם טוקנים ב-hash
// fragment (#access_token=...) שאף שרת לא יכול לראות (דפדפנים לא שולחים hash
// לשרת) — רק ה-SDK בדפדפן (createBrowserClient, detectSessionInUrl כברירת מחדל)
// מזהה ומעבד את זה, בין אם זה hash ובין אם code ב-query string.
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LOGO_URL } from '@/lib/brand'
import { authCardStyles } from '@/lib/auth-card-styles'

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // נוצר רק בתוך useEffect (client-only) — קריאה ל-createBrowserClient בגוף
  // הקומפוננטה ישירות רצה גם בעת ה-SSR prerender pass של Next.js, בלי env vars.
  const supabaseRef = useRef<SupabaseClient | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabaseRef.current = supabase

    // Supabase Studio שולחת קישור עם טוקנים ב-hash fragment (#access_token=...),
    // לא PKCE code — detectSessionInUrl של ה-SDK לא תמיד תופס את זה אוטומטית
    // ב-App Router, אז מפרשים את ה-hash ידנית וקוראים ל-setSession במפורש.
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
    const hashParams = new URLSearchParams(hash)
    const access_token = hashParams.get('access_token')
    const refresh_token = hashParams.get('refresh_token')

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error: sessionError }) => {
        if (sessionError) setError(sessionError.message)
        else setReady(true)
      })
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabaseRef.current) return
    setSubmitting(true)
    setError(null)
    const { error: updateError } = await supabaseRef.current.auth.updateUser({ password })
    setSubmitting(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    router.push('/participants')
  }

  if (!ready) {
    return (
      <div style={authCardStyles.body}>
        <div style={authCardStyles.card}>
          <img style={authCardStyles.logo} src={LOGO_URL} alt="החממה" />
          <h1 style={authCardStyles.h1}>קביעת סיסמה חדשה</h1>
          <p style={authCardStyles.helperText}>
            מאתר את קישור האיפוס... אם זה נמשך יותר מכמה שניות, הקישור פג תוקף — יש לבקש קישור חדש.
          </p>
          {error && <p style={authCardStyles.errorText}>{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div style={authCardStyles.body}>
      <div style={authCardStyles.card}>
        <img style={authCardStyles.logo} src={LOGO_URL} alt="החממה" />
        <h1 style={authCardStyles.h1}>קביעת סיסמה חדשה</h1>
        <form onSubmit={handleSubmit}>
          <label style={authCardStyles.label}>
            סיסמה חדשה
            <input
              style={authCardStyles.input}
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button style={authCardStyles.button} type="submit" disabled={submitting}>
            שמור סיסמה
          </button>
        </form>
        {error && <p style={authCardStyles.errorText}>{error}</p>}
      </div>
    </div>
  )
}
