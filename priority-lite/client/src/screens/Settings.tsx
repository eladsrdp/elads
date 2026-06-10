// מסך "הגדרות" — פרטי המשתמש, מצב המערכת, יציאה.
import { useEffect, useState } from 'react'
import { DangerButton } from '../components/forms'
import { db } from '../db/db'
import { api } from '../lib/api'
import { useAuth } from '../state/useAuth'

interface Health {
  ok: boolean
  priorityMode: 'mock' | 'real'
  emailMode: string
}

export function Settings() {
  const { me, logout } = useAuth()
  const [health, setHealth] = useState<Health | null>(null)
  const [entryCount, setEntryCount] = useState<number | null>(null)

  useEffect(() => {
    api<Health>('/api/health').then(setHealth).catch(() => setHealth(null))
    db.timeEntries.count().then(setEntryCount)
  }, [])

  return (
    <div className="space-y-4 pb-6">
      <div className="rounded-2xl bg-slate-800/40 p-4 ring-1 ring-slate-700/50">
        <h3 className="mb-3 text-sm font-medium text-slate-400">המשתמש המחובר</h3>
        <p className="text-lg font-semibold text-slate-100">{me?.name}</p>
        <p className="ltr-nums text-sm text-slate-500">{me?.phone}</p>
        <p className="text-xs text-slate-600">מס׳ עובד בפריוריטי: {me?.priorityEmpId}</p>
      </div>

      <div className="rounded-2xl bg-slate-800/40 p-4 ring-1 ring-slate-700/50">
        <h3 className="mb-3 text-sm font-medium text-slate-400">מצב המערכת</h3>
        <div className="space-y-1 text-sm text-slate-300">
          <p>
            חיבור לפריוריטי:{' '}
            {health === null ? (
              <span className="text-slate-500">בודק…</span>
            ) : health.priorityMode === 'real' ? (
              <span className="text-emerald-400">אמיתי ✓</span>
            ) : (
              <span className="text-amber-400">מדומה (mock) — לפיתוח</span>
            )}
          </p>
          <p>
            דיווחים שמורים מקומית:{' '}
            <span className="ltr-nums">{entryCount ?? '…'}</span>
          </p>
        </div>
      </div>

      <DangerButton onClick={() => void logout()}>התנתקות</DangerButton>
    </div>
  )
}
