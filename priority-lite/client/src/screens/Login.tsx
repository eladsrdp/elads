// מסך כניסה — טלפון → OTP במייל → session.
import { useEffect, useState } from 'react'
import { Field, PrimaryButton, TextInput } from '../components/forms'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../state/useAuth'
import type { Me } from '../types'

type Step = 'phone' | 'code'

export function Login() {
  const { login } = useAuth()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [emailHint, setEmailHint] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const requestCode = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await api<{ ok: true; emailHint: string }>('/api/auth/request-otp', {
        method: 'POST',
        json: { phone },
      })
      setEmailHint(res.emailHint)
      setStep('code')
      setCode('')
      setCooldown(30)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה — נסה שוב')
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    setBusy(true)
    setError('')
    try {
      const me = await api<Me>('/api/auth/verify-otp', { method: 'POST', json: { phone, code } })
      login(me)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה — נסה שוב')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <p className="text-5xl">⏱️</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-100">Priority Lite</h1>
        <p className="mt-1 text-sm text-slate-500">דיווחי שעות ופרויקטים — בקלות</p>
      </div>

      {step === 'phone' ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void requestCode()
          }}
        >
          <Field label="מספר טלפון נייד">
            <TextInput
              autoFocus
              type="tel"
              inputMode="tel"
              dir="ltr"
              placeholder="050-1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <PrimaryButton type="submit" disabled={busy || phone.trim().length < 9}>
            {busy ? 'שולח…' : 'שלח לי קוד למייל'}
          </PrimaryButton>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void verify()
          }}
        >
          <p className="text-center text-sm text-slate-400">
            שלחנו קוד בן 6 ספרות אל <span className="ltr-nums font-medium">{emailHint}</span>
          </p>
          <Field label="קוד אימות">
            <TextInput
              autoFocus
              inputMode="numeric"
              dir="ltr"
              maxLength={6}
              placeholder="● ● ● ● ● ●"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.25rem' }}
            />
          </Field>
          <PrimaryButton type="submit" disabled={busy || code.length !== 6}>
            {busy ? 'בודק…' : 'כניסה'}
          </PrimaryButton>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="text-slate-500 hover:text-slate-300"
            >
              ← מספר אחר
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || busy}
              onClick={() => void requestCode()}
              className="text-emerald-400 disabled:text-slate-600"
            >
              {cooldown > 0 ? `שלח שוב (${cooldown})` : 'שלח קוד חדש'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-4 text-center text-sm text-rose-400">{error}</p>}
    </div>
  )
}
