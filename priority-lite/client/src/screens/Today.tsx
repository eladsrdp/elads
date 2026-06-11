// מסך "היום" — טיימר, סה"כ שעות היום, פירוט לפי משימה, ודיווח ידני.
import { useState } from 'react'
import { AiEntryModal, type ParsedEntry } from '../components/AiEntryModal'
import { EntryRow } from '../components/EntryRow'
import { ManualEntryModal } from '../components/ManualEntryModal'
import { TimerCard } from '../components/TimerCard'
import { todayISO } from '../lib/date'
import { fmtMin } from '../lib/duration'
import { deleteEntry, useDayEntries } from '../state/useEntries'
import { useTimer } from '../state/useTimer'
import type { LocalTimeEntry } from '../types'

export function Today() {
  const today = todayISO()
  const entries = useDayEntries(today)
  const { running, elapsedMs } = useTimer()
  const [modalOpen, setModalOpen] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [editing, setEditing] = useState<LocalTimeEntry | null>(null)
  const [prefill, setPrefill] = useState<ParsedEntry | undefined>(undefined)

  const savedMin = (entries ?? []).reduce((sum, e) => sum + e.durationMin, 0)
  const runningMin = running ? Math.floor(elapsedMs / 60_000) : 0
  const totalMin = savedMin + runningMin

  const openManual = () => {
    setEditing(null)
    setPrefill(undefined)
    setModalOpen(true)
  }

  const handleParsed = (entry: ParsedEntry) => {
    setPrefill(entry)
    setEditing(null)
    setModalOpen(true)
  }

  return (
    <div className="space-y-4 pb-20">
      <TimerCard />

      <div className="rounded-3xl bg-slate-800/40 p-4 text-center ring-1 ring-slate-700/50">
        <p className="text-xs text-slate-500">סה״כ היום{running ? ' (כולל טיימר רץ)' : ''}</p>
        <p className="ltr-nums text-4xl font-bold tabular-nums text-emerald-400">{fmtMin(totalMin)}</p>
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
                  setPrefill(undefined)
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
        onParsed={handleParsed}
      />

      <ManualEntryModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
          setPrefill(undefined)
        }}
        editing={editing}
        initialValues={prefill}
      />
    </div>
  )
}
