// פעולות CRUD מעל ה-DB. שכבה דקה שמרכזת את הגישה לנתונים.
import { db } from './db'
import type { Recurring, ScopeId, Transaction, Transfer } from '../types'

// ===== Scopes =====

export async function updateScope(
  id: ScopeId,
  changes: Partial<{ name: string; creditLimit: number; currentBalance: number }>,
): Promise<void> {
  await db.scopes.update(id, changes)
}

// ===== Transactions =====

export async function addTransaction(t: Omit<Transaction, 'id'>): Promise<void> {
  await db.transactions.add(t as Transaction)
}

export async function deleteTransaction(id: number): Promise<void> {
  await db.transactions.delete(id)
}

/** אישור תנועה צפויה: הופך forecast ל-actual ומעדכן את יתרת הכיס בהתאם. */
export async function confirmTransaction(id: number): Promise<void> {
  await db.transaction('rw', db.transactions, db.scopes, async () => {
    const t = await db.transactions.get(id)
    if (!t || t.status === 'actual') return
    await db.transactions.update(id, { status: 'actual' })
    const scope = await db.scopes.get(t.scopeId)
    if (scope) {
      await db.scopes.update(t.scopeId, {
        currentBalance: scope.currentBalance + t.amount,
      })
    }
  })
}

/** ייבוא אצווה של תנועות actual, עם דילוג על כפילויות (תאריך+סכום+תיאור). */
export async function importTransactions(
  rows: Omit<Transaction, 'id'>[],
): Promise<{ added: number; skipped: number }> {
  let added = 0
  let skipped = 0
  await db.transaction('rw', db.transactions, async () => {
    for (const row of rows) {
      const dup = await db.transactions
        .where('[scopeId+status]')
        .equals([row.scopeId, row.status])
        .filter(
          (e) =>
            e.date === row.date &&
            e.amount === row.amount &&
            e.description === row.description,
        )
        .first()
      if (dup) {
        skipped += 1
      } else {
        await db.transactions.add(row as Transaction)
        added += 1
      }
    }
  })
  return { added, skipped }
}

// ===== Recurrings =====

export async function addRecurring(r: Omit<Recurring, 'id'>): Promise<void> {
  await db.recurrings.add(r as Recurring)
}

export async function deleteRecurring(id: number): Promise<void> {
  await db.recurrings.delete(id)
}

// ===== Transfers =====

export async function addTransfer(t: Omit<Transfer, 'id'>): Promise<void> {
  await db.transfers.add(t as Transfer)
}

export async function deleteTransfer(id: number): Promise<void> {
  await db.transfers.delete(id)
}
