// מסך "היום" — טיימר, סה"כ שעות היום, פירוט לפי משימה, ודיווח ידני.
import { useState } from 'react'
import { AiEntryModal, type ParsedEntry } from '../components/AiEntryModal'
import { EntryRow } from '../components/EntryRow'
import { PlusIcon, SparkleIcon } from '../components/icons'
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
  const [addOpen, setAddOpen] = useState(false)
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
    <div className="flex min-h-full flex-col space-y-4">
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
        <p className="py-6 text-center text-sm text-slate-500">
          עוד לא דיווחת היום — הפעל טיימר או הוסף דיווח ידני
        </p>
      )}

      {/* כפתור הוספה יחיד (דביק בתחתית אזור התוכן, בתוך מסגרת האפליקציה) — פותח תפריט: ידני / טקסט חופשי */}
      <div className="pointer-events-none sticky bottom-4 z-30 mt-auto flex justify-start pt-4">
        <div className="pointer-events-auto relative">
          {addOpen && (
            <>
              <button
                aria-label="סגור תפריט"
                className="fixed inset-0 z-0 cursor-default"
                onClick={() => setAddOpen(false)}
              />
              <div className="absolute bottom-16 right-0 z-10 w-56 space-y-2">
                <button
                  onClick={() => {
                    setAddOpen(false)
                    openManual()
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-slate-800 px-4 text-sm font-medium text-slate-100 shadow-lg ring-1 ring-slate-700 transition hover:bg-slate-700"
                >
                  <PlusIcon size={18} className="text-emerald-400" />
                  דיווח ידני
                </button>
                <button
                  onClick={() => {
                    setAddOpen(false)
                    setAiModalOpen(true)
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-slate-800 px-4 text-sm font-medium text-slate-100 shadow-lg ring-1 ring-slate-700 transition hover:bg-slate-700"
                >
                  <SparkleIcon size={18} className="text-violet-400" />
                  דיווח בטקסט חופשי
                </button>
              </div>
            </>
          )}
          <button
            onClick={() => setAddOpen((v) => !v)}
            aria-label="הוסף דיווח"
            aria-expanded={addOpen}
            className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
          >
            <PlusIcon
              size={26}
              className={`transition-transform ${addOpen ? 'rotate-45' : ''}`}
            />
          </button>
        </div>
      </div>

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
