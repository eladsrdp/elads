// מסך "משימות" — "שלי" / "הכל" / "לפי אדם", חיפוש, פילטר סטטוס, יצירת משימה.
import { useEffect, useMemo, useState } from 'react'
import { NewCustNoteModal } from '../components/NewCustNoteModal'
import { TaskRow } from '../components/TaskRow'
import { groupByHandler } from '../lib/groupTasks'
import { listEmployees, searchCustNotes } from '../state/useCustNotes'
import { useAuth } from '../state/useAuth'
import { TASK_STATUSES } from '../types'
import type { CustNote, TaskStatus } from '../types'

type Scope = 'mine' | 'all' | 'byPerson'

const SCOPES: { id: Scope; label: string }[] = [
  { id: 'mine', label: 'שלי' },
  { id: 'all', label: 'הכל' },
  { id: 'byPerson', label: 'לפי אדם' },
]

// תקרת השליפה בשרת — "לפי אדם" צריכה את כל המשימות הפתוחות, לא רק את 50 הראשונות.
// בפועל (2026-10-08) יש 912 משימות פתוחות בחברה, אז 2000 מכסה הכל עם מרווח.
const BY_PERSON_LIMIT = 2000

interface Props {
  onOpenTask: (id: number) => void
}

export function Tasks({ onOpenTask }: Props) {
  const { me } = useAuth()
  const [scope, setScope] = useState<Scope>('mine')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([])
  const [notes, setNotes] = useState<CustNote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [names, setNames] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // שמות מלאים — רק לעובדי priority-lite; לשאר האנשים מציגים את ה-login מפריוריטי
  useEffect(() => {
    listEmployees()
      .then((list) => setNames(Object.fromEntries(list.map((e) => [e.priorityEmpId, e.name]))))
      .catch(() => {
        // בלי שמות — ממשיכים להציג login, זה לא חוסם את המסך
      })
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    const timer = setTimeout(() => {
      searchCustNotes({
        q,
        mine: scope === 'mine',
        status: statusFilter.length ? statusFilter : undefined,
        limit: scope === 'byPerson' ? BY_PERSON_LIMIT : undefined,
      })
        .then(setNotes)
        .catch((err) => setError(err instanceof Error ? err.message : 'שגיאה בטעינת משימות'))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [q, scope, statusFilter, refreshKey])

  const toggleStatus = (s: TaskStatus) => {
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  const groups = useMemo(
    () => (scope === 'byPerson' ? groupByHandler(notes, me?.priorityEmpId, names) : []),
    [scope, notes, me?.priorityEmpId, names],
  )

  // ברירת מחדל: הקבוצה שלי פתוחה (ובחיפוש — הכל פתוח, כדי שלא יוסתרו תוצאות)
  const isGroupOpen = (key: string, isMe: boolean) => expanded[key] ?? (isMe || q.trim() !== '')

  return (
    <div className="space-y-3 pb-6">
      <div className="flex gap-1 rounded-xl bg-slate-800 p-1">
        {SCOPES.map((s) => (
          <button
            key={s.id}
            onClick={() => setScope(s.id)}
            className={`flex-1 rounded-lg py-1.5 text-sm transition ${
              scope === s.id ? 'bg-slate-600 text-slate-100' : 'text-slate-400'
            }`}
          >
            {s.label}
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

      {scope !== 'byPerson' && (
        <div className="space-y-1.5">
          {notes.map((n) => (
            <TaskRow
              key={n.id}
              note={n}
              onOpen={onOpenTask}
              handlerLabel={n.handlerEmpId ? (names[n.handlerEmpId] ?? n.handlerEmpId) : 'ללא שיוך'}
            />
          ))}
        </div>
      )}

      {scope === 'byPerson' && notes.length >= BY_PERSON_LIMIT && (
        <p className="text-xs text-amber-400">
          מוצגות {BY_PERSON_LIMIT} המשימות החדשות ביותר — ייתכן שחלק מהמשימות הישנות חסרות. סנן לפי סטטוס או חיפוש.
        </p>
      )}

      {scope === 'byPerson' && (
        <div className="space-y-2">
          {groups.map((g) => {
            const open = isGroupOpen(g.key, g.isMe)
            return (
              <div key={g.key} className="rounded-2xl ring-1 ring-slate-700/50">
                <button
                  onClick={() => setExpanded((prev) => ({ ...prev, [g.key]: !open }))}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between rounded-2xl bg-slate-800/60 px-3 py-2.5 text-right"
                >
                  <span className="font-medium text-slate-100">
                    {g.isMe ? `אני (${g.label})` : g.label}
                    <span className="mr-2 text-xs font-normal text-slate-500">
                      {g.notes.length === 1 ? 'משימה אחת' : `${g.notes.length} משימות`}
                    </span>
                  </span>
                  <span
                    className="text-slate-500"
                    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    ▾
                  </span>
                </button>
                {open && (
                  <div className="space-y-1.5 p-2">
                    {g.notes.map((n) => (
                      <TaskRow key={n.id} note={n} onOpen={onOpenTask} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <NewCustNoteModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
