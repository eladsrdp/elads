// שאילתות ופעולות על דיווחים מקומיים, כולל זרימת הסנכרון לפריוריטי.
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { api } from '../lib/api'
import type { LocalTimeEntry, SyncItemResult } from '../types'

/** טיוטות + שגיאות — מה שממתין לשליחה. */
export function usePendingEntries(): LocalTimeEntry[] | undefined {
  return useLiveQuery(async () => {
    const list = await db.timeEntries.where('status').anyOf('draft', 'error', 'pending').toArray()
    return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  }, [])
}

/** דיווחים שסונכרנו, מהחדש לישן. */
export function useSyncedEntries(limit = 100): LocalTimeEntry[] | undefined {
  return useLiveQuery(async () => {
    const list = await db.timeEntries.where('status').equals('synced').toArray()
    return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, limit)
  }, [limit])
}

/** כל הדיווחים של יום נתון (לכל הסטטוסים). */
export function useDayEntries(date: string): LocalTimeEntry[] | undefined {
  return useLiveQuery(
    () => db.timeEntries.where('date').equals(date).toArray(),
    [date],
  )
}

export async function addDraft(entry: LocalTimeEntry): Promise<void> {
  await db.timeEntries.add(entry)
}

export async function updateDraft(id: string, changes: Partial<LocalTimeEntry>): Promise<void> {
  await db.timeEntries.update(id, changes)
}

export async function deleteEntry(id: string): Promise<void> {
  await db.timeEntries.delete(id)
}

export interface SyncSummary {
  synced: number
  failed: number
}

/**
 * שולח את הדיווחים שנבחרו לפריוריטי.
 * draft/error → pending → (synced | error) לפי תוצאה פר-פריט.
 * כשל רשת כולל: כולם חוזרים ל-draft כדי שלא ייתקעו ב-pending.
 */
export async function syncEntries(ids: string[]): Promise<SyncSummary> {
  const entries = await db.timeEntries
    .where('id')
    .anyOf(ids)
    .and((e) => e.status === 'draft' || e.status === 'error')
    .toArray()
  if (entries.length === 0) return { synced: 0, failed: 0 }

  await db.timeEntries.bulkPut(
    entries.map((e) => ({ ...e, status: 'pending' as const, syncError: undefined })),
  )

  try {
    const { results } = await api<{ results: SyncItemResult[] }>('/api/time-entries/sync', {
      method: 'POST',
      json: {
        entries: entries.map((e) => ({
          clientId: e.id,
          taskId: e.taskId,
          date: e.date,
          durationMin: e.durationMin,
          startTime: e.startTime,
          endTime: e.endTime,
          note: e.note || undefined,
        })),
      },
    })

    let synced = 0
    let failed = 0
    for (const r of results) {
      if (r.ok) {
        synced++
        await db.timeEntries.update(r.clientId, {
          status: 'synced',
          priorityRef: r.priorityRef,
          syncError: undefined,
        })
      } else {
        failed++
        await db.timeEntries.update(r.clientId, { status: 'error', syncError: r.error })
      }
    }
    return { synced, failed }
  } catch (err) {
    await db.timeEntries.bulkPut(entries.map((e) => ({ ...e, status: 'draft' as const })))
    throw err
  }
}
