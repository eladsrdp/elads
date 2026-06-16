// דיווח ידני — יצירה או עריכה של טיוטה. תומך בקלט משך ("1:30") או שעות התחלה/סיום.
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { todayISO } from '../lib/date'
import { diffMinutes, fmtMin, parseDuration, roundUpToQuarterHour } from '../lib/duration'
import { addDraft, updateDraft } from '../state/useEntries'
import type { CustNote, LocalTimeEntry, ProjectSite, TaskSummary } from '../types'
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
  const [sites, setSites] = useState<ProjectSite[]>([])
  const [dcode, setDcode] = useState('')
  const [sitesLoading, setSitesLoading] = useState(false)
  const [custNotes, setCustNotes] = useState<CustNote[]>([])
  const [custNotesLoading, setCustNotesLoading] = useState(false)
  const [custnoteId, setCustnoteId] = useState<number | null>(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskSubject, setNewTaskSubject] = useState('')
  const [newTaskTillDate, setNewTaskTillDate] = useState('')
  const [newTaskLoading, setNewTaskLoading] = useState(false)

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
      setDcode(editing.dcode ?? '')
      setCustnoteId(editing.custnoteId ?? null)
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
      setDcode('')
      setCustnoteId(null)
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
      setDcode('')
      setCustnoteId(null)
    }
    setError('')
    setShowNewTask(false)
    setNewTaskSubject('')
    setNewTaskTillDate('')
  }, [open, editing, initialValues])

  // טעינת אתרי הלקוח (DCODE) ומשימות פתוחות (CUSTNOTESA) לפרויקט הנבחר
  useEffect(() => {
    if (!open || !task?.id) {
      setSites([])
      setCustNotes([])
      return
    }
    let cancelled = false
    setSitesLoading(true)
    setCustNotesLoading(true)
    const taskPath = `/api/tasks/${encodeURIComponent(task.id)}`
    Promise.all([
      api<ProjectSite[]>(`${taskPath}/sites`).catch(() => [] as ProjectSite[]),
      api<CustNote[]>(`${taskPath}/custnotes`).catch(() => [] as CustNote[]),
    ]).then(([s, n]) => {
      if (!cancelled) { setSites(s); setCustNotes(n) }
    }).finally(() => {
      if (!cancelled) { setSitesLoading(false); setCustNotesLoading(false) }
    })
    return () => { cancelled = true }
  }, [open, task?.id])

  const createNewTask = async () => {
    if (!task?.id || !newTaskSubject.trim()) return
    setNewTaskLoading(true)
    setError('')
    try {
      const created = await api<CustNote>(`/api/tasks/${encodeURIComponent(task.id)}/custnotes`, {
        method: 'POST',
        json: { subject: newTaskSubject.trim(), tillDate: newTaskTillDate || undefined },
      })
      setCustNotes((prev) => [created, ...prev])
      setCustnoteId(created.id)
      setShowNewTask(false)
      setNewTaskSubject('')
      setNewTaskTillDate('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת המשימה')
    } finally {
      setNewTaskLoading(false)
    }
  }

  const save = async () => {
    if (!task) return setError('בחר פרויקט')
    let durationMin: number | null
    if (mode === 'range') {
      if (!startTime || !endTime) return setError('מלא שעת התחלה וסיום')
      durationMin = diffMinutes(startTime, endTime)
      if (!durationMin) return setError('שעת הסיום חייבת להיות אחרי ההתחלה')
    } else {
      durationMin = parseDuration(durationText)
      if (!durationMin) return setError('משך לא תקין — לדוגמה: 1:30 או 1.5')
    }

    if (!note.trim()) return setError('כתוב על מה עבדת')

    if (sites.length > 0 && !dcode) return setError('בחר אתר')

    // כל דיווח מעוגל כלפי מעלה לרבע שעה
    durationMin = roundUpToQuarterHour(durationMin)

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
      dcode: dcode || undefined,
      siteName: sites.find((s) => s.code === dcode)?.name || undefined,
      custnoteId: custnoteId ?? undefined,
      custnoteName: custnoteId ? (custNotes.find((n) => n.id === custnoteId)?.subject ?? undefined) : undefined,
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
        <Field label="פרויקט">
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
              <span className="text-slate-500">לחץ לבחירת פרויקט…</span>
            )}
          </button>
        </Field>

        {/* בורר אתר (DCODE) — מופיע רק כשללקוח יש אתרים (למשל פיק אנד פאק) */}
        {task && (sitesLoading || sites.length > 0) && (
          <Field label="אתר *">
            {sitesLoading ? (
              <p className="px-1 py-2 text-sm text-slate-500">טוען אתרים…</p>
            ) : (
              <select
                value={dcode}
                onChange={(e) => setDcode(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-emerald-500"
              >
                <option value="">בחר אתר…</option>
                {sites.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}

        {/* בורר משימה (CUSTNOTESA) — אופציונלי, מופיע לאחר בחירת פרויקט */}
        {task && (
          <Field label="משימה (אופציונלי)">
            {custNotesLoading ? (
              <p className="px-1 py-2 text-sm text-slate-500">טוען משימות…</p>
            ) : (
              <>
                <div className="flex gap-2">
                  <select
                    value={custnoteId ?? ''}
                    onChange={(e) => setCustnoteId(e.target.value ? Number(e.target.value) : null)}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-emerald-500"
                  >
                    <option value="">ללא משימה</option>
                    {custNotes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.subject}{n.statDes ? ` · ${n.statDes}` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewTask((v) => !v)}
                    title="פתח משימה חדשה"
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-emerald-400 hover:border-emerald-600 transition"
                  >
                    +
                  </button>
                </div>

                {showNewTask && (
                  <div className="mt-2 rounded-xl border border-slate-600 bg-slate-800/50 p-3 space-y-2">
                    <p className="text-sm font-medium text-slate-300">פתיחת משימה חדשה</p>
                    <Field label="נושא *">
                      <TextInput
                        placeholder="תיאור קצר של המשימה"
                        value={newTaskSubject}
                        maxLength={52}
                        onChange={(e) => setNewTaskSubject(e.target.value)}
                      />
                    </Field>
                    <Field label="תאריך יעד">
                      <TextInput
                        type="date"
                        value={newTaskTillDate}
                        onChange={(e) => setNewTaskTillDate(e.target.value)}
                      />
                    </Field>
                    <div className="flex gap-2">
                      <PrimaryButton
                        onClick={createNewTask}
                        disabled={newTaskLoading || !newTaskSubject.trim()}
                      >
                        {newTaskLoading ? 'שולח…' : 'פתח משימה'}
                      </PrimaryButton>
                      <button
                        type="button"
                        onClick={() => { setShowNewTask(false); setNewTaskSubject(''); setNewTaskTillDate('') }}
                        className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 transition"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Field>
        )}

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

        <Field label="על מה עבדת? *">
          <TextInput
            placeholder="תיאור קצר של העבודה (חובה)"
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
