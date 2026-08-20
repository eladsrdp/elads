// בורר "לטיפול" — רשימת עובדי priority-lite בלבד (לא כל משתמשי פריוריטי).
import { useEffect, useState } from 'react'
import { listEmployees } from '../state/useCustNotes'
import type { EmployeeSummary } from '../types'
import { Modal } from './Modal'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (employee: EmployeeSummary) => void
}

export function AssigneePicker({ open, onClose, onSelect }: Props) {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    listEmployees()
      .then(setEmployees)
      .catch((err) => setError(err instanceof Error ? err.message : 'שגיאה בטעינת עובדים'))
      .finally(() => setLoading(false))
  }, [open])

  return (
    <Modal open={open} title="העבר לטיפול של" onClose={onClose}>
      {loading && <p className="py-4 text-center text-slate-500">טוען…</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {employees.map((e) => (
          <button
            key={e.priorityEmpId}
            onClick={() => {
              onSelect(e)
              onClose()
            }}
            className="block w-full rounded-xl px-3 py-2.5 text-right text-slate-100 transition hover:bg-slate-800"
          >
            {e.name}
          </button>
        ))}
        {!loading && employees.length === 0 && (
          <p className="py-4 text-center text-slate-600">אין עובדים ברשימה</p>
        )}
      </div>
    </Modal>
  )
}
