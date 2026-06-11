// שורת דיווח — שם משימה, משך, סטטוס, ופעולות עריכה/מחיקה לטיוטות.
import { fmtDateHe } from '../lib/date'
import { fmtMin } from '../lib/duration'
import type { LocalTimeEntry } from '../types'

interface Props {
  entry: LocalTimeEntry
  showDate?: boolean
  onEdit?: (e: LocalTimeEntry) => void
  onDelete?: (e: LocalTimeEntry) => void
}

const STATUS_CHIP: Record<LocalTimeEntry['status'], { label: string; cls: string }> = {
  draft: { label: 'טיוטה', cls: 'bg-amber-500/10 text-amber-400' },
  pending: { label: 'נשלח…', cls: 'bg-sky-500/10 text-sky-400' },
  synced: { label: 'בפריוריטי ✓', cls: 'bg-emerald-500/10 text-emerald-400' },
  error: { label: 'שגיאה', cls: 'bg-rose-500/10 text-rose-400' },
}

export function EntryRow({ entry, showDate, onEdit, onDelete }: Props) {
  const chip = STATUS_CHIP[entry.status]
  const editable = (entry.status === 'draft' || entry.status === 'error') && onEdit

  return (
    <div className="rounded-2xl bg-slate-800/60 p-3 ring-1 ring-slate-700/60">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-100">{entry.taskName}</p>
          <p className="truncate text-xs text-slate-500">
            {entry.projectName}
            {entry.siteName ? ` · 📍${entry.siteName}` : ''}
            {showDate ? ` · ${fmtDateHe(entry.date)}` : ''}
            {entry.startTime && entry.endTime ? (
              <span className="ltr-nums"> · {entry.startTime}–{entry.endTime}</span>
            ) : null}
          </p>
          {entry.note && <p className="mt-0.5 truncate text-xs text-slate-400">{entry.note}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="ltr-nums text-lg font-bold tabular-nums text-slate-100">
            {fmtMin(entry.durationMin)}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] ${chip.cls}`}>{chip.label}</span>
        </div>
      </div>

      {entry.status === 'error' && entry.syncError && (
        <p className="mt-2 rounded-lg bg-rose-500/10 px-2 py-1 text-xs text-rose-400">
          {entry.syncError}
        </p>
      )}

      {editable && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => onEdit(entry)}
            className="rounded-lg bg-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:bg-slate-600"
          >
            ✏️ ערוך
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(entry)}
              className="rounded-lg bg-slate-700 px-3 py-1 text-xs text-rose-300 transition hover:bg-slate-600"
            >
              🗑 מחק
            </button>
          )}
        </div>
      )}
    </div>
  )
}
