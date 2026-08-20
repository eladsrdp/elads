// priority-lite/client/src/components/NewCustNoteModal.tsx
// יצירת משימה חדשה מהטאב "משימות" — משתמש ב-endpoint הקיים ליצירת CUSTNOTESA בהקשר פרויקט.
import { useState } from 'react'
import { api } from '../lib/api'
import type { CustNote, TaskSummary } from '../types'
import { Field, PrimaryButton, TextInput } from './forms'
import { Modal } from './Modal'
import { TaskPicker } from './TaskPicker'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (note: CustNote) => void
}

export function NewCustNoteModal({ open, onClose, onCreated }: Props) {
  const [task, setTask] = useState<TaskSummary | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [tillDate, setTillDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setTask(null)
    setPickerOpen(false)
    setSubject('')
    setTillDate('')
    setError('')
  }

  const create = async () => {
    if (!task) return setError('בחר פרויקט')
    if (!subject.trim()) return setError('כתוב נושא למשימה')
    setLoading(true)
    setError('')
    try {
      const created = await api<CustNote>(`/api/tasks/${encodeURIComponent(task.id)}/custnotes`, {
        method: 'POST',
        json: { subject: subject.trim(), tillDate: tillDate || undefined },
      })
      onCreated(created)
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת המשימה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title="משימה חדשה"
      onClose={() => {
        reset()
        onClose()
      }}
    >
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
        <Field label="נושא *">
          <TextInput
            placeholder="תיאור קצר של המשימה"
            value={subject}
            maxLength={52}
            onChange={(e) => setSubject(e.target.value)}
          />
        </Field>
        <Field label="תאריך יעד">
          <TextInput type="date" value={tillDate} onChange={(e) => setTillDate(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <PrimaryButton onClick={create} disabled={loading}>
          {loading ? 'שולח…' : 'צור משימה'}
        </PrimaryButton>
      </div>
      <TaskPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={setTask} />
    </Modal>
  )
}
