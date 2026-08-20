// בדיקות ל-AppDB.local-impl עבור צ'קליסט/טיוטות מקומיים (Phase 2).
import { describe, expect, it } from 'vitest'
import { createLocalDb } from '../src/db/local-impl'

describe('checklist items (local db)', () => {
  it('יוצר ומחזיר פריט לפי phone+taskId', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await db.createChecklistItem('0501111111', 42, 'קנה חלב')
    expect(created.text).toBe('קנה חלב')
    expect(created.task_id).toBe(42)
    expect(created.done).toBe(false)

    const items = await db.listChecklistItems('0501111111', 42)
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(created.id)
  })

  it('taskId=null מבודד פריטים עצמאיים מפריטים משויכים', async () => {
    const db = createLocalDb('__nonexistent__')
    await db.createChecklistItem('0501111111', 42, 'משויך')
    await db.createChecklistItem('0501111111', null, 'עצמאי')
    expect(await db.listChecklistItems('0501111111', null)).toHaveLength(1)
    expect(await db.listChecklistItems('0501111111', 42)).toHaveLength(1)
  })

  it('משתמש אחר לא רואה פריטים של משתמש אחר', async () => {
    const db = createLocalDb('__nonexistent__')
    await db.createChecklistItem('0501111111', null, 'שלי')
    expect(await db.listChecklistItems('0502222222', null)).toHaveLength(0)
  })

  it('updateChecklistItem מחזיר undefined על פריט של משתמש אחר, ולא משנה אותו', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await db.createChecklistItem('0501111111', null, 'שלי')
    const result = await db.updateChecklistItem('0502222222', created.id, { done: true })
    expect(result).toBeUndefined()
    const items = await db.listChecklistItems('0501111111', null)
    expect(items[0].done).toBe(false)
  })

  it('deleteChecklistItem מחזיר false על פריט של משתמש אחר, ולא מוחק אותו', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await db.createChecklistItem('0501111111', null, 'שלי')
    expect(await db.deleteChecklistItem('0502222222', created.id)).toBe(false)
    expect(await db.listChecklistItems('0501111111', null)).toHaveLength(1)
  })

  it('deleteChecklistItem מחזיר true ומוחק בפועל את הבעלים האמיתי', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await db.createChecklistItem('0501111111', null, 'שלי')
    expect(await db.deleteChecklistItem('0501111111', created.id)).toBe(true)
    expect(await db.listChecklistItems('0501111111', null)).toHaveLength(0)
  })

  it('reorderChecklistItems מסדר מחדש לפי הסדר הנתון', async () => {
    const db = createLocalDb('__nonexistent__')
    const a = await db.createChecklistItem('0501111111', null, 'א')
    const b = await db.createChecklistItem('0501111111', null, 'ב')
    const ok = await db.reorderChecklistItems('0501111111', null, [b.id, a.id])
    expect(ok).toBe(true)
    const items = await db.listChecklistItems('0501111111', null)
    expect(items.map((i) => i.id)).toEqual([b.id, a.id])
  })

  it('reorderChecklistItems דוחה רשימה עם מזהה שלא שייך לסקופ', async () => {
    const db = createLocalDb('__nonexistent__')
    const a = await db.createChecklistItem('0501111111', null, 'א')
    const ok = await db.reorderChecklistItems('0501111111', null, [a.id, 9999])
    expect(ok).toBe(false)
  })

  it('reorderChecklistItems דוחה מזהה כפול, ולא דורס sort_order', async () => {
    const db = createLocalDb('__nonexistent__')
    const a = await db.createChecklistItem('0501111111', null, 'א')
    const b = await db.createChecklistItem('0501111111', null, 'ב')
    const ok = await db.reorderChecklistItems('0501111111', null, [a.id, a.id])
    expect(ok).toBe(false)
    const items = await db.listChecklistItems('0501111111', null)
    expect(items.map((i) => i.id)).toEqual([a.id, b.id])
    expect(items.map((i) => i.sort_order)).toEqual([0, 1])
  })
})

describe('drafts (local db)', () => {
  it('יוצר, מעדכן, ומוחק טיוטה בבידוד לפי phone', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await db.createDraft('0501111111', null, 'טיוטה ראשונה')
    expect(created.text).toBe('טיוטה ראשונה')

    const updated = await db.updateDraft('0501111111', created.id, 'טיוטה מעודכנת')
    expect(updated?.text).toBe('טיוטה מעודכנת')

    expect(await db.updateDraft('0502222222', created.id, 'לא אמור')).toBeUndefined()
    expect(await db.deleteDraft('0502222222', created.id)).toBe(false)
    expect(await db.deleteDraft('0501111111', created.id)).toBe(true)
    expect(await db.listDrafts('0501111111', null)).toHaveLength(0)
  })

  it('taskId=null מבודד טיוטות עצמאיות מטיוטות משויכות', async () => {
    const db = createLocalDb('__nonexistent__')
    await db.createDraft('0501111111', 42, 'משויכת')
    await db.createDraft('0501111111', null, 'עצמאית')
    expect(await db.listDrafts('0501111111', null)).toHaveLength(1)
    expect(await db.listDrafts('0501111111', 42)).toHaveLength(1)
  })
})
