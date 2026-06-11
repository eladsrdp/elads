// דיווח ידני — יצירה או עריכה של טיוטה. תומך בקלט משך ("1:30") או שעות התחלה/סיום.
import { useEffect, useState } from 'react'
import { todayISO } from '../lib/date'
import { diffMinutes, fmtMin, parseDuration } from '../lib/duration'
import { addDraft, updateDraft } from '../state/useEntries'
import type { LocalTimeEntry, TaskSummary } from '../types'
import type { ParsedEntry } from './AiEntryModal'
import { Field, PrimaryButton, TextInput } from './forms'
import { Modal } from './Modal'
import { TaskPicker } from './TaskPicker'

interface Props {
  open: boolean
  onClose: () => void
  /** אם מוגדר — מצב עריכה של טיוטה קיימת */
  editing?: LocalTimeEntry | null
  /** ערכים ראשוניים מ-AI parse (מצב יצירה בלבד) */
  initialValues?: ParsedEntry
}

type Mode = 'duration' | 'range'

export function ManualEntryModal({ open, onClose, editing, initialValues }: Props) {
  const [task, setTask] = useState<TaskSummary | null>(null)
  const [date, setDate] = useState(todayISO())
  const [mode, setMode] = useState<Mode>('duration')
  const [durationText, setDurationText] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [note, setNote] = useState('')
  const [billable, setBillable] = useState(false)
  const [ordName, setOrdName] = useState('')
  const [ordLine, setOrdLine] = useState('')
  const [extraOpen, setExtraOpen] = useState(false)
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
      setBillable(editing.billable ?? false)
      setOrdName(editing.ordName ?? '')
      setOrdLine(editing.ordLine != null ? String(editing.ordLine) : '')
      setExtraOpen(!!(editing.ordName || editing.ordLine != null))
    } else if (initialValues) {
      setTask(initialValues.task ?? null)
      setDate(initialValues.date ?? todayISO())
      setMode('duration')
      setDurationText(initialValues.durationMin ? fmtMin(initialValues.durationMin) : '')
      setStartTime('')
      setEndTime('')
      setNote(initialValues.note ?? '')
      setBillable(initialValues.billable ?? false)
      setOrdName(initialValues.ordName ?? '')
      setOrdLine(initialValues.ordLine != null ? String(initialValues.ordLine) : '')
      setExtraOpen(!!(initialValues.ordName || initialValues.ordLine != null))
    } else {
      setTask(null)
      setDate(todayISO())
      setMode('duration')
      setDurationText('')
      setStartTime('')
      setEndTime('')
      setNote('')
      setBillable(false)
      setOrdName('')
      setOrdLine('')
      setExtraOpen(false)
    }
    setError('')
  }, [open, editing, initialValues])

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

    const parsedOrdLine = ordLine.trim() ? parseInt(ordLine, 10) : undefined
    if (ordLine.trim() && (isNaN(parsedOrdLine!) || parsedOrdLine! < 1)) {
      return setError('שורת הזמנה חייבת להיות מספר חיובי')
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
      billable: billable || undefined,
      ordName: ordName.trim() || undefined,
      ordLine: parsedOrdLine,
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

        {/* דגל לחיוב — תמיד גלוי */}
        <button
          type="button"
          onClick={() => setBillable((v) => !v)}
          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
            billable
              ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300'
              : 'border-slate-700 bg-slate-800 text-slate-400'
          }`}
        >
          <span>לחיוב</span>
          <span
            className={`h-5 w-9 rounded-full transition-colors ${billable ? 'bg-emerald-500' : 'bg-slate-600'} relative`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                billable ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </span>
        </button>

        {/* פרטים נוספים — מספר הזמנה + שורה */}
        <div>
          <button
            type="button"
            onClick={() => setExtraOpen((v) => !v)}
            className="flex w-full items-center justify-between text-sm text-slate-400"
          >
            <span>פרטים נוספים (הזמנה / שורה)</span>
            <span className="transition-transform" style={{ transform: extraOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▾
            </span>
          </button>

          {extraOpen && (
            <div className="mt-2 space-y-3">
              <Field label="מספר הזמנה (ORDNAME)">
                <TextInput
                  dir="ltr"
                  placeholder="SO24000058"
                  value={ordName}
                  maxLength={50}
                  onChange={(e) => setOrdName(e.target.value)}
                />
              </Field>
              <Field label="שורת הזמנה (OLINE)">
                <TextInput
                  type="number"
                  dir="ltr"
                  placeholder="1"
                  value={ordLine}
                  min={1}
                  onChange={(e) => setOrdLine(e.target.value)}
                />
              </Field>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <PrimaryButton onClick={save}>{editing ? 'שמור שינויים' : 'שמור טיוטה'}</PrimaryButton>
      </div>

      <TaskPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={setTask} />
    </Modal>
  )
}
