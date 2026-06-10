// בסיס הנתונים המקומי (IndexedDB דרך Dexie) — טיוטות דיווחים ומטמון משימות.
import Dexie, { type EntityTable } from 'dexie'
import type { LocalTimeEntry, TaskSummary } from '../types'

export type CachedTask = TaskSummary & { cachedAt: number }

export class PriorityLiteDB extends Dexie {
  timeEntries!: EntityTable<LocalTimeEntry, 'id'>
  tasksCache!: EntityTable<CachedTask, 'id'>

  constructor() {
    super('priority-lite')
    this.version(1).stores({
      timeEntries: 'id, status, date, taskId, [status+date]',
      tasksCache: 'id, name',
    })
  }
}

export const db = new PriorityLiteDB()
