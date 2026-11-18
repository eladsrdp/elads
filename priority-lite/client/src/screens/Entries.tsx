// מסך "דיווחים" — טיוטות ממתינות + אישור ושליחה לפריוריטי + היסטוריה מסונכרנת.
import { useState } from 'react'
import { EntryRow } from '../components/EntryRow'
import { SendIcon } from '../components/icons'
import { ManualEntryModal } from '../components/ManualEntryModal'
import { fmtDateHe } from '../lib/date'
import { fmtMin } from '../lib/duration'
import {
  deleteEntry,
  syncEntries,
  usePendingEntries,
  useSyncedEntries,
} from '../state/useEntries'
import type { LocalTimeEntry } from '../types'

export function Entries() {
  const pending = usePendingEntries()
  const synced = useSyncedEntries()
  const [editing, setEditing] = useState<LocalTimeEntry | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')

  const sendable = (pending ?? []).filter((e) => e.status === 'draft' || e.status === 'error')
  const totalSendableMin = sendable.reduce((s, e) => s + e.durationMin, 0)

  const handleSync = async () => {
    // "על מה עבדת" חובה לכל דיווח — חוסם טיוטות מהטיימר/AI שאין בהן הערה
    const missingNote = sendable.filter((e) => !e.note?.trim())
    if (missingNote.length > 0) {
      setMessage(
        `יש להוסיף "על מה עבדת" ל-${missingNote.length} דיווחים לפני שליחה — ערוך אותם והשלם`,
      )
      return
    }
    setSyncing(true)
    setMessage('')
    try {
      const { synced: ok, failed, networkError } = await syncEntries(sendable.map((e) => e.id))
      if (networkError) {
        setMessage(
          ok > 0
            ? `✓ ${ok} נשלחו, אך אין חיבור לשרת — השאר נשארו כטיוטה, נסה שוב מאוחר יותר`
            : '✗ אין חיבור לשרת — הטיוטות נשמרו, נסה שוב מאוחר יותר',
        )
      } else {
        setMessage(
          failed === 0
            ? `✓ ${ok} דיווחים נשלחו לפריוריטי`
            : `${ok} נשלחו, ${failed} נכשלו — ראה שגיאות למטה`,
        )
      }
    } catch {
      setMessage('✗ אין חיבור לשרת — הטיוטות נשמרו, נסה שוב מאוחר יותר')
    } finally {
      setSyncing(false)
    }
  }

  // קיבוץ מסונכרנים לפי תאריך
  const syncedByDate = new Map<string, LocalTimeEntry[]>()
  for (const e of synced ?? []) {
    const list = syncedByDate.get(e.date) ?? []
    list.push(e)
    syncedByDate.set(e.date, list)
  }

  return (
    <div className="space-y-5 pb-6">
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-slate-400">
          ממתינים לשליחה {sendable.length > 0 && `(${sendable.length})`}
        </h2>

        {pending === undefined && <p className="text-sm text-slate-500">טוען…</p>}
        {pending && pending.length === 0 && (
          <p className="rounded-2xl bg-slate-800/40 py-5 text-center text-sm text-slate-500">
            אין טיוטות ממתינות 🎉
          </p>
        )}
        {(pending ?? []).map((e) => (
          <EntryRow
            key={e.id}
            entry={e}
            showDate
            onEdit={(entry) => setEditing(entry)}
            onDelete={(entry) => void deleteEntry(entry.id)}
          />
        ))}

      </section>

      {syncedByDate.size > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-400">נשלחו לפריוריטי</h2>
          {[...syncedByDate.entries()].map(([date, list]) => (
            <div key={date} className="space-y-2">
              <p className="text-xs text-slate-500">{fmtDateHe(date)}</p>
              {list.map((e) => (
                <EntryRow key={e.id} entry={e} />
              ))}
            </div>
          ))}
        </section>
      )}

      {/* סרגל שליחה דביק — תמיד גלוי בתחתית המסך, גם כשיש הרבה טיוטות (במקום כפתור בסוף הרשימה) */}
      {(sendable.length > 0 || message) && (
        <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-slate-700 bg-slate-900/95 px-4 py-3 backdrop-blur">
          {message && (
            <p className="rounded-xl bg-slate-800/60 px-3 py-2 text-center text-sm text-slate-300">
              {message}
            </p>
          )}
          {sendable.length > 0 && (
            <button
              onClick={() => void handleSync()}
              disabled={syncing}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <SendIcon size={20} />
              {syncing
                ? 'שולח לפריוריטי…'
                : `שלח לפריוריטי — ${sendable.length} דיווחים (${fmtMin(totalSendableMin)})`}
            </button>
          )}
        </div>
      )}

      <ManualEntryModal open={editing !== null} onClose={() => setEditing(null)} editing={editing} />
    </div>
  )
}
