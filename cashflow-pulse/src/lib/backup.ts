// גיבוי ושחזור של כל הנתונים המקומיים לקובץ JSON.
import { db, DEFAULT_SCOPES } from '../db/db'
import type { Recurring, Scope, Transaction, Transfer } from '../types'

interface BackupFile {
  app: 'cashflow-pulse'
  version: 1
  exportedAt: string
  scopes: Scope[]
  transactions: Transaction[]
  recurrings: Recurring[]
  transfers: Transfer[]
}

export async function exportBackup(): Promise<void> {
  const [scopes, transactions, recurrings, transfers] = await Promise.all([
    db.scopes.toArray(),
    db.transactions.toArray(),
    db.recurrings.toArray(),
    db.transfers.toArray(),
  ])
  const payload: BackupFile = {
    app: 'cashflow-pulse',
    version: 1,
    exportedAt: new Date().toISOString(),
    scopes,
    transactions,
    recurrings,
    transfers,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cashflow-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** משחזר מקובץ גיבוי. מוחק את כל הנתונים הקיימים ומחליף. */
export async function importBackup(file: File): Promise<void> {
  const text = await file.text()
  const data = JSON.parse(text) as Partial<BackupFile>
  if (data.app !== 'cashflow-pulse') {
    throw new Error('קובץ לא תקין — זה אינו גיבוי של Cash Flow Pulse')
  }
  await db.transaction(
    'rw',
    db.scopes,
    db.transactions,
    db.recurrings,
    db.transfers,
    async () => {
      await Promise.all([
        db.scopes.clear(),
        db.transactions.clear(),
        db.recurrings.clear(),
        db.transfers.clear(),
      ])
      await db.scopes.bulkAdd(data.scopes?.length ? data.scopes : DEFAULT_SCOPES)
      if (data.transactions?.length) await db.transactions.bulkAdd(data.transactions)
      if (data.recurrings?.length) await db.recurrings.bulkAdd(data.recurrings)
      if (data.transfers?.length) await db.transfers.bulkAdd(data.transfers)
    },
  )
}
