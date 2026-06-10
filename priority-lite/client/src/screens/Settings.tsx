// מסך "הגדרות" — פרטי המשתמש, משיכה מפריוריטי, מצב המערכת, יציאה.
import { useEffect, useState } from 'react'
import { DangerButton } from '../components/forms'
import { db } from '../db/db'
import { rangeMonth, rangeWeek, toISODate } from '../lib/date'
import { api } from '../lib/api'
import { importFromPriority } from '../state/useEntries'
import { useAuth } from '../state/useAuth'

interface Health {
  ok: boolean
  priorityMode: 'mock' | 'real'
  emailMode: string
}

const PRESETS = [
  { label: 'השבוע', range: () => rangeWeek() },
  { label: 'החודש', range: () => rangeMonth() },
  {
    label: '30 יום',
    range: () => {
      const to = new Date()
      const from = new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000)
      return { from: toISODate(from), to: toISODate(to) }
    },
  },
]

export function Settings() {
  const { me, logout } = useAuth()
  const [health, setHealth] = useState<Health | null>(null)
  const [entryCount, setEntryCount] = useState<number | null>(null)
  const [importing, setImporting] = useState<string | null>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  useEffect(() => {
    api<Health>('/api/health').then(setHealth).catch(() => setHealth(null))
    db.timeEntries.count().then(setEntryCount)
  }, [])

  const runImport = async (label: string, from: string, to: string) => {
    setImporting(label)
    setImportMsg(null)
    try {
      const { added, skipped } = await importFromPriority(from, to)
      const msg =
        added === 0
          ? 'אין דיווחים חדשים לייבא'
          : `נוספו ${added} דיווחים${skipped ? ` (${skipped} כבר קיימים)` : ''}`
      setImportMsg(msg)
      db.timeEntries.count().then(setEntryCount)
    } catch (e) {
      setImportMsg(`שגיאה: ${e instanceof Error ? e.message : 'נסה שוב'}`)
    } finally {
      setImporting(null)
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="rounded-2xl bg-slate-800/40 p-4 ring-1 ring-slate-700/50">
        <h3 className="mb-3 text-sm font-medium text-slate-400">המשתמש המחובר</h3>
        <p className="text-lg font-semibold text-slate-100">{me?.name}</p>
        <p className="ltr-nums text-sm text-slate-500">{me?.phone}</p>
        <p className="text-xs text-slate-600">מס׳ עובד בפריוריטי: {me?.priorityEmpId}</p>
      </div>

      <div className="rounded-2xl bg-slate-800/40 p-4 ring-1 ring-slate-700/50">
        <h3 className="mb-3 text-sm font-medium text-slate-400">משיכת דיווחים מפריוריטי</h3>
        <p className="mb-3 text-xs text-slate-500">
          טוען דיווחים קיימים מפריוריטי לתצוגה מקומית. דיווחים כפולים מדולגים אוטומטית.
        </p>
        <div className="flex gap-2">
          {PRESETS.map(({ label, range }) => (
            <button
              key={label}
              disabled={importing !== null}
              onClick={() => {
                const { from, to } = range()
                void runImport(label, from, to)
              }}
              className="flex-1 rounded-xl border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-600 disabled:opacity-40"
            >
              {importing === label ? '…' : label}
            </button>
          ))}
        </div>
        {importMsg && (
          <p
            className={`mt-2 text-sm ${importMsg.startsWith('שגיאה') ? 'text-rose-400' : 'text-emerald-400'}`}
          >
            {importMsg}
          </p>
        )}
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
