// כרטיס הטיימר — הרכיב המרכזי במסך "היום".
import { useState } from 'react'
import { fmtElapsed, useTimer } from '../state/useTimer'
import type { TaskSummary } from '../types'
import { TaskPicker } from './TaskPicker'

export function TimerCard() {
  const { running, elapsedMs, isStale, start, stop, discard, updateNote } = useTimer()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [stopping, setStopping] = useState(false)

  const handleStop = async () => {
    setStopping(true)
    try {
      await stop()
    } finally {
      setStopping(false)
    }
  }

  if (!running) {
    return (
      <>
        <button
          onClick={() => setPickerOpen(true)}
          className="flex w-full flex-col items-center gap-2 rounded-3xl bg-slate-800/60 py-8 ring-1 ring-slate-700 transition hover:ring-emerald-500"
        >
          <span className="text-4xl">▶️</span>
          <span className="font-semibold text-slate-100">התחל טיימר</span>
          <span className="text-xs text-slate-500">בחר פרויקט והתחל לעבוד</span>
        </button>
        <TaskPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(task: TaskSummary) => start(task)}
        />
      </>
    )
  }

  return (
    <div className="rounded-3xl bg-slate-800/60 p-5 ring-1 ring-emerald-500/40">
      <div className="mb-1 flex items-center gap-2">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
        <span className="text-xs text-emerald-400">טיימר פעיל</span>
      </div>
      <p className="font-semibold text-slate-100">{running.taskName}</p>
      <p className="text-xs text-slate-500">{running.projectName}</p>
      <p className="ltr-nums my-3 text-center text-5xl font-bold tabular-nums text-slate-100">
        {fmtElapsed(elapsedMs)}
      </p>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs text-slate-400">על מה עבדת? *</span>
        <input
          value={running.note ?? ''}
          onChange={(e) => updateNote(e.target.value)}
          placeholder="תיאור קצר של העבודה (חובה לשליחה)"
          maxLength={500}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-emerald-500"
        />
      </label>

      {isStale && (
        <div className="mb-3 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-400">
          הטיימר רץ יותר מ-16 שעות — נראה ששכחת אותו. אפשר לשמור בכל זאת או לבטל.
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleStop}
          disabled={stopping}
          className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 font-semibold text-white transition hover:bg-rose-500 disabled:opacity-40"
        >
          ⏹ עצור ושמור טיוטה
        </button>
        {isStale && (
          <button
            onClick={discard}
            className="rounded-xl bg-slate-700 px-4 py-2.5 text-slate-300 transition hover:bg-slate-600"
          >
            בטל
          </button>
        )}
      </div>
    </div>
  )
}
