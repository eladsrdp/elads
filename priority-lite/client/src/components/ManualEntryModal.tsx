// דיווח ידני — יצירה או עריכה של טיוטה. תומך בקלט משך ("1:30") או שעות התחלה/סיום.
import { useEffect, useState } from 'react'
import { todayISO } from '../lib/date'
import { diffMinutes, fmtMin, parseDuration } from '../lib/duration'
import { addDraft, updateDraft } from '../state/useEntries'
import type { LocalTimeEntry, TaskSummary } from '../types'
import { Field, PrimaryButton, TextInput } from './forms'
import { Modal } from './Modal'
import { TaskPicker } from './TaskPicker'

interface Props {
  open: boolean
  onClose: () => void
  /** אם מוגדר — מצב עריכה של טיוטה קיימת */
  editing?: LocalTimeEntry | null
}

type Mode = 'duration' | 'range'

export function ManualEntryModal({ open, onClose, editing }: Props) {
  const [task, setTask] = useState<TaskSummary | null>(null)
  const [date, setDate] = useState(todayISO())
  const [mode, setMode] = useState<Mode>('duration')
  const [durationText, setDurationText] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [note, setNote] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setTask({
        id: editing.taskId,
        name: editing.taskName,
        projectId: '',
        projectName: editing.projectName,
      })
      setDate(editing.date)
      setMode(editing.startTime && editing.endTime ? 'range' : 'duration')
      setDurationText(fmtMin(editing.durationMin))
      setStartTime(editing.startTime ?? '')
      setEndTime(editing.endTime ?? '')
      setNote(editing.note ?? '')
    } else {
      setTask(null)
      setDate(todayISO())
      setMode('duration')
      setDurationText('')
      setStartTime('')
      setEndTime('')
      setNote('')
    }
    setError('')
  }, [open, editing])

  const save = async () => {
    if (!task) return setError('בחר משימה')
    let durationMin: number | null
    if (mode === 'range') {
      if (!startTime || !endTime) return setError('מלא שעת התחלה וסיום')
      durationMin = diffMinutes(startTime, endTime)
      if (!durationMin) return setError('שעת הסיום חייבת להיות אחרי ההתחלה')
    } else {
      durationMin = parseDuration(durationText)
      if (!durationMin) return setError('משך לא תקין — לדוגמה: 1:30 או 1.5')
    }

    const fields = {
      date,
      taskId: task.id,
      taskName: task.name,
      projectName: task.projectName,
      durationMin,
      startTime: mode === 'range' ? startTime : undefined,
      endTime: mode === 'range' ? endTime : undefined,
      note: note.trim() || undefined,
    }

    if (editing) {
      await updateDraft(editing.id, { ...fields, status: 'draft', syncError: undefined })
    } else {
      await addDraft({
        id: crypto.randomUUID(),
        status: 'draft',
        source: 'manual',
        createdAt: Date.now(),
        ...fields,
      })
    }
    onClose()
  }

  return (
    <Modal open={open} title={editing ? 'עריכת דיווח' : 'דיווח ידני'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="משימה">
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-right text-slate-100"
          >
            {task ? (
              <>
                <span className="block">{task.name}</span>
                <span className="block text-xs text-slate-500">{task.projectName}</span>
              </>
            ) : (
              <span className="text-slate-500">לחץ לבחירת משימה…</span>
            )}
          </button>
        </Field>

        <Field label="תאריך">
          <TextInput type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <div className="flex gap-1 rounded-xl bg-slate-800 p-1">
          {(['duration', 'range'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-lg py-1.5 text-sm transition ${
                mode === m ? 'bg-slate-600 text-slate-100' : 'text-slate-400'
              }`}
            >
              {m === 'duration' ? 'לפי משך' : 'לפי שעות'}
            </button>
          ))}
        </div>

        {mode === 'duration' ? (
          <Field label="משך (שעות:דקות, או שעות עשרוניות)">
            <TextInput
              inputMode="decimal"
              dir="ltr"
              placeholder="1:30"
              value={durationText}
              onChange={(e) => setDurationText(e.target.value)}
            />
          </Field>
        ) : (
          <div className="flex gap-3">
            <Field label="התחלה">
              <TextInput type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </Field>
            <Field label="סיום">
              <TextInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </Field>
          </div>
        )}

        <Field label="הערה (אופציונלי)">
          <TextInput
            placeholder="על מה עבדת?"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <PrimaryButton onClick={save}>{editing ? 'שמור שינויים' : 'שמור טיוטה'}</PrimaryButton>
      </div>

      <TaskPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={setTask} />
    </Modal>
  )
}
