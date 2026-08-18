// בדיקות לשכבת ה-actions של צ'קליסט/טיוטות מקומיים (Phase 2) — מיפוי ל-camelCase + בידוד לפי משתמש.
import { describe, expect, it } from 'vitest'
import type { Me } from '@priority-lite/shared'
import {
  createChecklistItem,
  createChecklistItemSchema,
  createDraft,
  createDraftSchema,
  deleteChecklistItem,
  listChecklistItems,
  listChecklistItemsSchema,
  reorderChecklistItems,
  reorderChecklistSchema,
  updateChecklistItem,
  updateChecklistItemSchema,
} from '../src/actions'
import { createLocalDb } from '../src/db/local-impl'

const me: Me = { phone: '0501234567', name: 'אלעד', priorityEmpId: '42' }
const other: Me = { phone: '0509999999', name: 'רועי', priorityEmpId: '99' }

describe('checklist actions', () => {
  it('יוצר פריט וממפה ל-camelCase (ChecklistItem)', async () => {
    const db = createLocalDb('__nonexistent__')
    const input = createChecklistItemSchema.parse({ text: 'משימה' })
    const created = await createChecklistItem(db, me, input)
    expect(created.text).toBe('משימה')
    expect(created.done).toBe(false)
    expect(created.taskId).toBeUndefined()
    expect(created.sortOrder).toBe(0)
  })

  it('רשימה מסוננת לפי taskId', async () => {
    const db = createLocalDb('__nonexistent__')
    await createChecklistItem(db, me, createChecklistItemSchema.parse({ taskId: 5001, text: 'עם משימה' }))
    await createChecklistItem(db, me, createChecklistItemSchema.parse({ text: 'עצמאי' }))
    const scoped = await listChecklistItems(db, me, listChecklistItemsSchema.parse({ taskId: 5001 }))
    expect(scoped).toHaveLength(1)
    expect(scoped[0].taskId).toBe(5001)
  })

  it('משתמש אחר לא יכול לעדכן פריט של מישהו אחר', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await createChecklistItem(db, me, createChecklistItemSchema.parse({ text: 'שלי' }))
    const result = await updateChecklistItem(db, other, created.id, updateChecklistItemSchema.parse({ done: true }))
    expect(result).toBeUndefined()
  })

  it('משתמש אחר לא יכול למחוק פריט של מישהו אחר', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await createChecklistItem(db, me, createChecklistItemSchema.parse({ text: 'שלי' }))
    expect(await deleteChecklistItem(db, other, created.id)).toBe(false)
  })

  it('reorder דוחה סדר עם מזהה שלא שייך למשתמש', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await createChecklistItem(db, me, createChecklistItemSchema.parse({ text: 'שלי' }))
    const ok = await reorderChecklistItems(db, other, reorderChecklistSchema.parse({ orderedIds: [created.id] }))
    expect(ok).toBe(false)
  })

  it('טקסט ריק נדחה בסכימה', () => {
    expect(() => createChecklistItemSchema.parse({ text: '' })).toThrow()
  })
})

describe('draft actions', () => {
  it('יוצר טיוטה וממפה ל-camelCase (DraftNote)', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await createDraft(db, me, createDraftSchema.parse({ text: 'טיוטה' }))
    expect(created.text).toBe('טיוטה')
    expect(created.taskId).toBeUndefined()
  })

  it('טקסט ריק נדחה בסכימה', () => {
    expect(() => createDraftSchema.parse({ text: '' })).toThrow()
  })
})
