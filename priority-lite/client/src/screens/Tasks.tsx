// מסך "משימות" — טאב "שלי"/"הכל", חיפוש, פילטר סטטוס, יצירת משימה.
import { useEffect, useState } from 'react'
import { NewCustNoteModal } from '../components/NewCustNoteModal'
import { searchCustNotes } from '../state/useCustNotes'
import { TASK_STATUSES } from '../types'
import type { CustNote, TaskStatus } from '../types'

type Scope = 'mine' | 'all'

interface Props {
  onOpenTask: (id: number) => void
}

export function Tasks({ onOpenTask }: Props) {
  const [scope, setScope] = useState<Scope>('mine')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([])
  const [notes, setNotes] = useState<CustNote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError('')
    const timer = setTimeout(() => {
      searchCustNotes({ q, mine: scope === 'mine', status: statusFilter.length ? statusFilter : undefined })
        .then(setNotes)
        .catch((err) => setError(err instanceof Error ? err.message : 'שגיאה בטעינת משימות'))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [q, scope, statusFilter, refreshKey])

  const toggleStatus = (s: TaskStatus) => {
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  return (
    <div className="space-y-3 pb-6">
      <div className="flex gap-1 rounded-xl bg-slate-800 p-1">
        {(['mine', 'all'] as Scope[]).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`flex-1 rounded-lg py-1.5 text-sm transition ${
              scope === s ? 'bg-slate-600 text-slate-100' : 'text-slate-400'
            }`}
          >
            {s === 'mine' ? 'שלי' : 'הכל'}
          </button>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="חפש משימה…"
        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-emerald-500"
      />

      <button
        onClick={() => setNewOpen(true)}
        className="w-full rounded-xl border border-violet-600 bg-violet-900/30 px-3 py-2.5 text-sm font-medium text-violet-300 transition hover:bg-violet-900/50"
      >
        + משימה חדשה
      </button>

      <div className="flex flex-wrap gap-1.5">
        {TASK_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => toggleStatus(s)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              statusFilter.includes(s)
                ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300'
                : 'border-slate-700 text-slate-400'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <p className="py-4 text-center text-slate-500">טוען…</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {!loading && notes.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-600">לא נמצאו משימות</p>
      )}

      <div className="space-y-1.5">
        {notes.map((n) => (
          <button
            key={n.id}
            onClick={() => onOpenTask(n.id)}
            className="block w-full rounded-2xl bg-slate-800/40 p-3 text-right ring-1 ring-slate-700/50"
          >
            <span className="block font-medium text-slate-100">{n.subject}</span>
            <span className="block text-xs text-slate-500">
              {n.custDes}
              {n.statDes ? ` · ${n.statDes}` : ''}
              {n.tillDate ? ` · יעד ${n.tillDate}` : ''}
            </span>
          </button>
        ))}
      </div>

      <NewCustNoteModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
