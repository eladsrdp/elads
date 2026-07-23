// שאילתות ופעולות על דיווחים מקומיים, כולל זרימת הסנכרון וייבוא מפריוריטי.
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { api } from '../lib/api'
import { chunk } from '../lib/array'
import type { LocalTimeEntry, RemoteTimeEntry, SyncItemResult } from '../types'

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

export interface ImportSummary {
  added: number
  skipped: number
}

/** מושך דיווחים קיימים מפריוריטי ושומר אותם מקומית כ-synced. מדלג על כפילויות לפי priorityRef. */
export async function importFromPriority(from: string, to: string): Promise<ImportSummary> {
  const remote = await api<RemoteTimeEntry[]>(`/api/time-entries?from=${from}&to=${to}`)

  const allLocal = await db.timeEntries.toArray()
  const existingRefs = new Set(allLocal.map((e) => e.priorityRef).filter((r): r is string => !!r))

  const toAdd: LocalTimeEntry[] = remote
    .filter((e) => !existingRefs.has(e.priorityRef))
    .map((e) => ({
      id: crypto.randomUUID(),
      status: 'synced' as const,
      date: e.date,
      taskId: e.taskId,
      taskName: e.taskName,
      projectName: e.projectName ?? '',
      durationMin: e.durationMin,
      note: e.note,
      source: 'manual' as const,
      priorityRef: e.priorityRef,
      createdAt: Date.now(),
    }))

  if (toAdd.length > 0) await db.timeEntries.bulkAdd(toAdd)
  return { added: toAdd.length, skipped: remote.length - toAdd.length }
}

export interface SyncSummary {
  synced: number
  failed: number
  /** כשל רשת עצר את הסנכרון באמצע — synced/failed משקפים את מה שהושג עד כה. */
  networkError?: boolean
}

/**
 * מספר הדיווחים שנשלחים ב-POST אחד לשרת. פריוריטי מטופל בכל מקרה בטור אחד-אחד בשרת
 * (ראו odata.ts) — הפיצול כאן הוא כדי שכל בקשה מהדפדפן תסתיים מהר, כך שהאטה או ניסיון-חוזר
 * על פריט בודד לא יגרור timeout על כל הקבוצה (ראו vault: אבחון 33:30/10 דיווחים 2026-07-09).
 */
const SYNC_CHUNK_SIZE = 3

function toSyncPayload(e: LocalTimeEntry) {
  return {
    clientId: e.id,
    taskId: e.taskId,
    date: e.date,
    durationMin: e.durationMin,
    startTime: e.startTime,
    endTime: e.endTime,
    note: e.note || undefined,
    ordName: e.ordName || undefined,
    ordLine: e.ordLine,
    billable: e.billable,
    dcode: e.dcode || undefined,
    custnoteId: e.custnoteId,
  }
}

/**
 * שולח את הדיווחים שנבחרו לפריוריטי, בקבוצות קטנות (SYNC_CHUNK_SIZE) כדי שכשל רשת
 * ייגע רק בקבוצה הנוכחית ולא במה שכבר נשלח בהצלחה.
 * draft/error → pending → (synced | error) לפי תוצאה פר-פריט.
 * כשל רשת בקבוצה: היא (ורק היא) חוזרת ל-draft, והסנכרון נעצר (אין טעם להמשיך בלי רשת).
 */
export async function syncEntries(ids: string[]): Promise<SyncSummary> {
  const entries = await db.timeEntries
    .where('id')
    .anyOf(ids)
    .and((e) => e.status === 'draft' || e.status === 'error')
    .toArray()
  if (entries.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0

  for (const group of chunk(entries, SYNC_CHUNK_SIZE)) {
    await db.timeEntries.bulkPut(
      group.map((e) => ({ ...e, status: 'pending' as const, syncError: undefined })),
    )

    try {
      const { results } = await api<{ results: SyncItemResult[] }>('/api/time-entries/sync', {
        method: 'POST',
        json: { entries: group.map(toSyncPayload) },
      })
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
    } catch {
      await db.timeEntries.bulkPut(group.map((e) => ({ ...e, status: 'draft' as const })))
      return { synced, failed, networkError: true }
    }
  }

  return { synced, failed }
}
