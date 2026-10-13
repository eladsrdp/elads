// שורת דיווח — שם משימה, משך, סטטוס, ופעולות עריכה/מחיקה לטיוטות.
import { useState } from 'react'
import { fmtDateHe } from '../lib/date'
import { fmtMin } from '../lib/duration'
import type { LocalTimeEntry } from '../types'
import { PencilIcon, TrashIcon } from './icons'

interface Props {
  entry: LocalTimeEntry
  showDate?: boolean
  onEdit?: (e: LocalTimeEntry) => void
  onDelete?: (e: LocalTimeEntry) => void
}

const STATUS_CHIP: Record<LocalTimeEntry['status'], { label: string; cls: string }> = {
  draft: { label: 'טיוטה', cls: 'bg-amber-500/10 text-amber-400' },
  pending: { label: 'נשלח…', cls: 'bg-sky-500/10 text-sky-400' },
  synced: { label: 'בפריוריטי ✓', cls: 'bg-success-500/10 text-success-400' },
  error: { label: 'שגיאה', cls: 'bg-rose-500/10 text-rose-400' },
}

const ACTION_BTN =
  'flex min-h-10 items-center gap-1.5 rounded-xl bg-slate-700 px-3.5 text-sm transition hover:bg-slate-600'

export function EntryRow({ entry, showDate, onEdit, onDelete }: Props) {
  const chip = STATUS_CHIP[entry.status]
  const editable = (entry.status === 'draft' || entry.status === 'error') && onEdit
  // מחיקה בשני שלבים — לחיצה ראשונה מבקשת אישור, כדי שלא תימחק טיוטה בטעות
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="rounded-2xl bg-slate-800/60 p-3.5 ring-1 ring-slate-700/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-slate-100">{entry.taskName}</p>
          <p className="truncate text-xs text-slate-400">
            {entry.projectName}
            {entry.siteName ? ` · 📍${entry.siteName}` : ''}
            {showDate ? ` · ${fmtDateHe(entry.date)}` : ''}
            {entry.startTime && entry.endTime ? (
              <span className="ltr-nums"> · {entry.startTime}–{entry.endTime}</span>
            ) : null}
          </p>
          {entry.note && <p className="mt-1 truncate text-sm text-slate-300">{entry.note}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="ltr-nums text-xl font-bold tabular-nums text-slate-100">
            {fmtMin(entry.durationMin)}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] ${chip.cls}`}>{chip.label}</span>
        </div>
      </div>

      {entry.status === 'error' && entry.syncError && (
        <p className="mt-2 rounded-lg bg-rose-500/10 px-2 py-1 text-xs text-rose-400">
          {entry.syncError}
        </p>
      )}

      {editable && (
        <div className="mt-3 flex gap-2">
          {confirmDelete ? (
            <>
              <button
                onClick={() => {
                  setConfirmDelete(false)
                  onDelete?.(entry)
                }}
                className="flex min-h-10 items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 text-sm font-medium text-white transition hover:bg-rose-500"
              >
                <TrashIcon size={16} />
                כן, מחק
              </button>
              <button onClick={() => setConfirmDelete(false)} className={`${ACTION_BTN} text-slate-300`}>
                ביטול
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onEdit(entry)} className={`${ACTION_BTN} text-slate-200`}>
                <PencilIcon size={16} />
                ערוך
              </button>
              {onDelete && (
                <button onClick={() => setConfirmDelete(true)} className={`${ACTION_BTN} text-rose-300`}>
                  <TrashIcon size={16} />
                  מחק
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
