// בסיס הנתונים המקומי (IndexedDB דרך Dexie).
import Dexie, { type EntityTable } from 'dexie'
import type { Recurring, Scope, Transaction, Transfer } from '../types'

export class CashflowDB extends Dexie {
  scopes!: EntityTable<Scope, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  recurrings!: EntityTable<Recurring, 'id'>
  transfers!: EntityTable<Transfer, 'id'>

  constructor() {
    super('cashflow-pulse')
    this.version(1).stores({
      // id מפורש לכיסים (לא auto-increment); אינדקסים לשליפות לפי כיס/סטטוס/תאריך
      scopes: 'id',
      transactions: '++id, scopeId, status, date, [scopeId+status]',
      recurrings: '++id, scopeId',
      transfers: '++id, fromScope, toScope',
    })
  }
}

export const db = new CashflowDB()

/** ערכי ברירת מחדל לשני הכיסים בהפעלה ראשונה. */
export const DEFAULT_SCOPES: Scope[] = [
  { id: 'business', name: 'עסקי', creditLimit: 0, currentBalance: 0 },
  { id: 'home', name: 'ביתי', creditLimit: 0, currentBalance: 0 },
]

// Singleton — מונע seed כפול במצב StrictMode (ה-effect רץ פעמיים).
let seedPromise: Promise<void> | null = null

/** יוצר את הכיסים החסרים. בטוח לקריאה חוזרת ולמרוצי StrictMode. */
export function ensureSeeded(): Promise<void> {
  if (!seedPromise) seedPromise = doSeed()
  return seedPromise
}

async function doSeed(): Promise<void> {
  const existing = await db.scopes.toArray()
  const haveIds = new Set(existing.map((s) => s.id))
  const missing = DEFAULT_SCOPES.filter((s) => !haveIds.has(s.id))
  if (missing.length === 0) return
  try {
    await db.scopes.bulkAdd(missing)
  } catch {
    // התנגשות race — הכיסים כבר נוצרו בקריאה מקבילה. אפשר להתעלם.
  }
}
