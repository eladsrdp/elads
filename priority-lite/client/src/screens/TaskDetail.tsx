// priority-lite/client/src/screens/TaskDetail.tsx
// מסך פרטי משימה — עריכת סטטוס/עדיפות/תאריך/לטיפול/תיאור, היסטוריית סטטוס.
import { useEffect, useRef, useState } from 'react'
import { AssigneePicker } from '../components/AssigneePicker'
import { ChecklistSection } from '../components/ChecklistSection'
import { DraftsSection } from '../components/DraftsSection'
import { getCustNoteDetail, updateCustNote } from '../state/useCustNotes'
import { TASK_STATUSES } from '../types'
import type { CustNote, EmployeeSummary, UpdateCustNoteInput } from '../types'

interface Props {
  id: number
  onBack: () => void
}

export function TaskDetail({ id, onBack }: Props) {
  const [note, setNote] = useState<CustNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [descriptionText, setDescriptionText] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  // מצב React (`saving`) מתעדכן רק אחרי render — לא עוצר קריאה שנייה שמתחילה באותו
  // "tick" סינכרוני (למשל blur על שדה עדיפות ואז click מיידי על כפתור סטטוס, לפני
  // ש-React הספיק להריץ render עם saving=true). ref מתעדכן מיידית וסוגר את החלון הזה.
  const savingRef = useRef(false)

  useEffect(() => {
    setLoading(true)
    setError('')
    getCustNoteDetail(id)
      .then(setNote)
      .catch((err) => setError(err instanceof Error ? err.message : 'שגיאה בטעינת המשימה'))
      .finally(() => setLoading(false))
  }, [id])

  // מחזיר true/false (הצלחה) כדי שקוראים (כמו saveDescription) יוכלו להגיב בהתאם —
  // לא רק זורק, כי applyChange כבר "בולע" את השגיאה ומציג אותה ב-UI בעצמו.
  // saving גודר את כל הפקדים המשנים (סטטוס/עדיפות/תאריך/לטיפול) כדי שלא יתאפשרו
  // שתי קריאות applyChange חופפות על אותה משימה (שהייתה עלולה לגרום לאחת "לדרוס" את השנייה).
  const applyChange = async (changes: UpdateCustNoteInput): Promise<boolean> => {
    if (!note || savingRef.current) return false
    savingRef.current = true
    const previous = note
    setNote({ ...note, ...changes, statDes: changes.status ?? note.statDes })
    setSaving(true)
    setError('')
    try {
      const updated = await updateCustNote(id, changes)
      setNote(updated)
      return true
    } catch (err) {
      setNote(previous)
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון — נסה שוב')
      return false
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const saveDescription = async () => {
    if (!descriptionText.trim()) return
    const ok = await applyChange({ description: descriptionText.trim() })
    // מנקים את הטיוטה רק אם השמירה הצליחה — אחרת המשתמש מאבד את מה שהקליד בכשל רשת.
    if (ok) setDescriptionText('')
  }

  if (loading) return <p className="py-6 text-center text-slate-500">טוען…</p>
  if (!note) return <p className="py-6 text-center text-rose-400">{error || 'משימה לא נמצאה'}</p>

  return (
    <div className="space-y-4 pb-6">
      <button onClick={onBack} className="text-sm text-slate-400">
        ← חזרה
      </button>

      <div className="rounded-2xl bg-slate-800/40 p-4 ring-1 ring-slate-700/50">
        <h2 className="text-lg font-bold text-slate-100">{note.subject}</h2>
        <p className="text-sm text-slate-500">{note.custDes}</p>
        {note.hoursReported != null && (
          <p className="mt-1 text-xs text-slate-500">שעות שדווחו: {note.hoursReported}</p>
        )}
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div className="space-y-1">
        <p className="text-xs text-slate-500">סטטוס</p>
        {/* סטטוסים מפריוריטי שאינם בתת-הקבוצה הנבחרת (TASK_STATUSES) לא מקבלים צ'יפ —
            בלעדי השורה הזו הסטטוס האמיתי היה נעלם לגמרי מהמסך. */}
        {note.statDes && !(TASK_STATUSES as readonly string[]).includes(note.statDes) && (
          <p className="text-xs text-slate-400">
            סטטוס נוכחי (לא ברשימה המקוצרת): <span className="text-slate-200">{note.statDes}</span>
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {TASK_STATUSES.map((s) => (
            <button
              key={s}
              disabled={saving}
              onClick={() => applyChange({ status: s })}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                note.statDes === s
                  ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300'
                  : 'border-slate-700 text-slate-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-xs text-slate-500">עדיפות (0-99)</p>
          <input
            key={`priority-${note.priority ?? ''}`}
            type="number"
            min={0}
            max={99}
            disabled={saving}
            defaultValue={note.priority ?? ''}
            onBlur={(e) => {
              const v = e.target.value ? Number(e.target.value) : undefined
              if (v != null && v >= 0 && v <= 99) applyChange({ priority: v })
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 disabled:opacity-50"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-slate-500">תאריך יעד</p>
          <input
            key={`tilldate-${note.tillDate ?? ''}`}
            type="date"
            disabled={saving}
            defaultValue={note.tillDate ?? ''}
            onBlur={(e) => {
              if (e.target.value) applyChange({ tillDate: e.target.value })
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-slate-500">אחראי משימה</p>
        <p className="text-sm text-slate-300">{note.ownerName ?? '—'}</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-slate-500">לטיפול</p>
        <button
          onClick={() => setPickerOpen(true)}
          disabled={saving}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-right text-slate-100 disabled:opacity-50"
        >
          {note.handlerName ?? note.handlerEmpId ?? 'בחר איש צוות…'}
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-500">תיאור</p>
        {note.description && (
          <p className="whitespace-pre-wrap rounded-xl bg-slate-800/60 p-3 text-sm text-slate-300">
            {note.description}
          </p>
        )}
        <textarea
          value={descriptionText}
          onChange={(e) => setDescriptionText(e.target.value)}
          placeholder="הוסף עדכון…"
          rows={3}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
        />
        <button
          onClick={saveDescription}
          disabled={saving || !descriptionText.trim()}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          הוסף עדכון
        </button>
      </div>

      <div>
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          className="flex w-full items-center justify-between text-sm text-slate-400"
        >
          <span>היסטוריית סטטוס</span>
          <span style={{ transform: historyOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </button>
        {historyOpen && (
          <div className="mt-2 space-y-1.5">
            {(note.history ?? []).map((h, i) => (
              <div key={i} className="rounded-xl bg-slate-800/40 p-2.5 text-xs text-slate-400">
                <span className="text-slate-300">{h.status}</span> · {h.date}
                {h.handlerName ? ` · ${h.handlerName}` : ''}
              </div>
            ))}
            {(note.history ?? []).length === 0 && <p className="text-xs text-slate-600">אין היסטוריה</p>}
          </div>
        )}
      </div>

      <AssigneePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(e: EmployeeSummary) => applyChange({ handlerEmpId: e.priorityEmpId })}
      />

      <ChecklistSection taskId={note.id} />
      <DraftsSection taskId={note.id} />
    </div>
  )
}
