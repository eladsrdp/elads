// מסך כניסה — טלפון → QR (פעם ראשונה) / קוד (כניסות חוזרות).
import { useState } from 'react'
import { Field, PrimaryButton, TextInput } from '../components/forms'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../state/useAuth'
import type { Me } from '../types'

type Step = 'phone' | 'qr' | 'code'

export function Login() {
  const { login } = useAuth()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const initiate = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await api<{ ok: true; firstTime: boolean; qrDataUrl?: string }>(
        '/api/auth/initiate',
        { method: 'POST', json: { phone } },
      )
      setCode('')
      if (res.firstTime && res.qrDataUrl) {
        setQrDataUrl(res.qrDataUrl)
        setStep('qr')
      } else {
        setStep('code')
      }
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
      const me = await api<Me>('/api/auth/verify', { method: 'POST', json: { phone, code } })
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

      {step === 'phone' && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void initiate()
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
            {busy ? 'בודק…' : 'המשך'}
          </PrimaryButton>
        </form>
      )}

      {step === 'qr' && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void verify()
          }}
        >
          <div className="text-center">
            <p className="text-sm font-medium text-slate-300">הגדרה ראשונה</p>
            <p className="mt-1 text-xs text-slate-400">
              סרוק עם Google Authenticator ואז הזן את הקוד
            </p>
          </div>
          <div className="flex justify-center">
            <img src={qrDataUrl} alt="QR Code" className="rounded-lg" width={200} height={200} />
          </div>
          <Field label="קוד מה-Authenticator">
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
          <button
            type="button"
            onClick={() => setStep('phone')}
            className="block w-full text-center text-sm text-slate-500 hover:text-slate-300"
          >
            ← מספר אחר
          </button>
        </form>
      )}

      {step === 'code' && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void verify()
          }}
        >
          <p className="text-center text-sm text-slate-400">הזן את הקוד מה-Google Authenticator</p>
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
          <button
            type="button"
            onClick={() => setStep('phone')}
            className="block w-full text-center text-sm text-slate-500 hover:text-slate-300"
          >
            ← מספר אחר
          </button>
        </form>
      )}

      {error && <p className="mt-4 text-center text-sm text-rose-400">{error}</p>}
    </div>
  )
}
