// מסך "היום" — טיימר, סה"כ שעות היום, פירוט לפי משימה, ודיווח ידני.
import { useState } from 'react'
import { AiEntryModal, type ParsedEntry } from '../components/AiEntryModal'
import { EntryRow } from '../components/EntryRow'
import { ManualEntryModal } from '../components/ManualEntryModal'
import { TimerCard } from '../components/TimerCard'
import { todayISO } from '../lib/date'
import { fmtMin, roundUpToQuarterHour } from '../lib/duration'
import { addDraft, deleteEntry, useDayEntries } from '../state/useEntries'
import { useTimer } from '../state/useTimer'
import type { LocalTimeEntry } from '../types'

export function Today() {
  const today = todayISO()
  const entries = useDayEntries(today)
  const { running, elapsedMs } = useTimer()
  const [modalOpen, setModalOpen] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [editing, setEditing] = useState<LocalTimeEntry | null>(null)

  const savedMin = (entries ?? []).reduce((sum, e) => sum + e.durationMin, 0)
  const runningMin = running ? Math.floor(elapsedMs / 60_000) : 0
  const totalMin = savedMin + runningMin

  const openManual = () => {
    setEditing(null)
    setModalOpen(true)
  }

  // יוצר טיוטה לכל דיווח שזוהה ע"י ה-AI. נשמרות ל"היום" ועריכה דרך השורה.
  const handleConfirm = async (parsed: ParsedEntry[]) => {
    const base = Date.now()
    for (let i = 0; i < parsed.length; i++) {
      const e = parsed[i]
      await addDraft({
        id: crypto.randomUUID(),
        status: 'draft',
        source: 'manual',
        createdAt: base + i,
        date: e.date ?? today,
        taskId: e.task?.id ?? '',
        taskName: e.task?.name ?? '',
        projectName: e.task?.projectName ?? '',
        durationMin: roundUpToQuarterHour(e.durationMin ?? 0),
        note: e.note,
        billable: e.billable,
        ordName: e.ordName,
        ordLine: e.ordLine,
      })
    }
  }

  return (
    <div className="space-y-4 pb-20">
      <TimerCard />

      <div className="rounded-3xl bg-slate-800/40 p-4 text-center ring-1 ring-slate-700/50">
        <p className="text-xs text-slate-500">סה״כ היום{running ? ' (כולל טיימר רץ)' : ''}</p>
        <p className="font-display ltr-nums text-4xl tabular-nums text-emerald-400">{fmtMin(totalMin)}</p>
      </div>

      {entries && entries.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-slate-400">הדיווחים של היום</h2>
          {entries
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((e) => (
              <EntryRow
                key={e.id}
                entry={e}
                onEdit={(entry) => {
                  setEditing(entry)
                  setModalOpen(true)
                }}
                onDelete={(entry) => void deleteEntry(entry.id)}
              />
            ))}
        </div>
      )}

      {entries && entries.length === 0 && !running && (
        <p className="py-6 text-center text-sm text-slate-600">
          עוד לא דיווחת היום — הפעל טיימר או הוסף דיווח ידני
        </p>
      )}

      {/* כפתורים צפים — דיווח ידני + AI */}
      <button
        onClick={openManual}
        className="fixed bottom-20 left-20 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
        aria-label="דיווח ידני"
      >
        ＋
      </button>
      <button
        onClick={() => setAiModalOpen(true)}
        className="fixed bottom-20 left-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-xl text-white shadow-lg shadow-violet-500/30 transition hover:bg-violet-500"
        aria-label="דיווח בטקסט חופשי"
        title="הוסף דיווח בטקסט חופשי או קול"
      >
        ✦
      </button>

      <AiEntryModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onConfirm={handleConfirm}
      />

      <ManualEntryModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        editing={editing}
      />
    </div>
  )
}
