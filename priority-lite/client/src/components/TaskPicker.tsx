// בורר משימות — חיפוש חי מול השרת עם debounce, ונפילה למטמון מקומי כשאין רשת.
import { useEffect, useRef, useState } from 'react'
import { db } from '../db/db'
import { api } from '../lib/api'
import type { TaskSummary } from '../types'
import { Modal } from './Modal'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (task: TaskSummary) => void
}

export function TaskPicker({ open, onClose, onSelect }: Props) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<TaskSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [offline, setOffline] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const tasks = await api<TaskSummary[]>(`/api/tasks?q=${encodeURIComponent(q)}`)
        setResults(tasks)
        setOffline(false)
        // רענון המטמון — מאפשר בחירת משימה גם בלי רשת בפעם הבאה
        await db.tasksCache.bulkPut(tasks.map((t) => ({ ...t, cachedAt: Date.now() })))
      } catch {
        const cached = await db.tasksCache.toArray()
        const needle = q.trim()
        setResults(
          cached.filter((t) => !needle || t.name.includes(needle) || t.projectName.includes(needle)),
        )
        setOffline(true)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer.current)
  }, [q, open])

  return (
    <Modal open={open} title="בחירת משימה" onClose={onClose}>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="חפש משימה או פרויקט…"
        className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-emerald-500"
      />
      {offline && (
        <p className="mb-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400">
          אין חיבור לשרת — מציג משימות מהמטמון המקומי
        </p>
      )}
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {loading && results.length === 0 && <p className="py-4 text-center text-slate-500">מחפש…</p>}
        {!loading && results.length === 0 && (
          <p className="py-4 text-center text-slate-500">לא נמצאו משימות</p>
        )}
        {results.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              onSelect(t)
              onClose()
            }}
            className="block w-full rounded-xl px-3 py-2.5 text-right transition hover:bg-slate-800"
          >
            <span className="block font-medium text-slate-100">{t.name}</span>
            <span className="block text-xs text-slate-500">
              {t.projectName} · <span className="ltr-nums">{t.id}</span>
              {t.status ? ` · ${t.status}` : ''}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
