import { useState } from 'react'
import type { Me } from '@make-issues/shared'
import { Field, PrimaryButton, TextInput } from '../components/forms'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../state/useAuth'

export function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const me = await api<Me>('/api/auth/login', { method: 'POST', json: { username, password } })
      login(me)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה — נסה שוב')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-8 text-center text-2xl font-bold text-slate-100">תקלות Make</h1>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Field label="שם משתמש">
          <TextInput autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="סיסמה">
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <PrimaryButton type="submit" disabled={busy || !username || !password}>
          {busy ? 'מתחבר…' : 'כניסה'}
        </PrimaryButton>
        {error && <p className="text-center text-sm text-rose-400">{error}</p>}
      </form>
    </div>
  )
}
