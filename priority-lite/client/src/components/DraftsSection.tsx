// priority-lite/client/src/components/DraftsSection.tsx
// טיוטות חופשיות אישיות מקומיות (Phase 2) — לא מסונכרנות עם פריוריטי.
import { useEffect, useState } from 'react'
import { createDraft, deleteDraft, listDrafts, updateDraft } from '../state/useLocalItems'
import type { DraftNote } from '../types'

interface Props {
  taskId?: number
}

export function DraftsSection({ taskId }: Props) {
  const [drafts, setDrafts] = useState<DraftNote[]>([])
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    listDrafts(taskId)
      .then(setDrafts)
      .catch((err) => setError(err instanceof Error ? err.message : 'שגיאה בטעינה'))
  }, [taskId])

  const add = async () => {
    if (!newText.trim()) return
    try {
      const created = await createDraft({ taskId, text: newText.trim() })
      setDrafts((prev) => [...prev, created])
      setNewText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהוספה')
    }
  }

  const startEdit = (d: DraftNote) => {
    setEditingId(d.id)
    setEditText(d.text)
  }

  const saveEdit = async () => {
    if (editingId == null || !editText.trim()) return
    try {
      const updated = await updateDraft(editingId, editText.trim())
      setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון')
    }
  }

  const remove = async (id: number) => {
    const prev = drafts
    setDrafts((cur) => cur.filter((d) => d.id !== id))
    try {
      await deleteDraft(id)
    } catch (err) {
      setDrafts(prev)
      setError(err instanceof Error ? err.message : 'שגיאה במחיקה')
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">טיוטות</p>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div className="space-y-1.5">
        {drafts.map((d) => (
          <div key={d.id} className="rounded-xl bg-slate-800/40 p-2.5">
            {editingId === d.id ? (
              <div className="space-y-1.5">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white">
                    שמור
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-slate-400">
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-wrap text-sm text-slate-200">{d.text}</p>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => startEdit(d)} className="text-xs text-slate-500" aria-label="ערוך">
                    ✎
                  </button>
                  <button onClick={() => remove(d.id)} className="text-xs text-slate-500" aria-label="מחק">
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="טיוטה חדשה…"
          className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
        <button
          onClick={add}
          disabled={!newText.trim()}
          className="rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          הוסף
        </button>
      </div>
    </div>
  )
}
