// בדיקות לשכבת ה-actions החדשה של משימות לקוח מול ה-mock adapter.
import { describe, expect, it } from 'vitest'
import type { Me } from '@priority-lite/shared'
import {
  createCustNote,
  createCustNoteSchema,
  getCustNoteDetail,
  listEmployees,
  searchCustNotes,
  searchCustNotesSchema,
  updateCustNote,
  updateCustNoteSchema,
} from '../src/actions'
import { createMockAdapter } from '../src/priority/mock'
import { createLocalDb } from '../src/db/local-impl'

const me: Me = { phone: '0501234567', name: 'אלעד', priorityEmpId: '42' }

describe('searchCustNotes action', () => {
  it('mine=true ממופה ל-handlerEmpId של המשתמש המחובר', async () => {
    const adapter = createMockAdapter()
    const parsed = searchCustNotesSchema.parse({ q: '', mine: true, limit: 50 })
    const hits = await searchCustNotes(adapter, me, parsed)
    expect(hits.length).toBeGreaterThan(0)
    for (const n of hits) expect(n.handlerEmpId).toBe('42')
  })

  it('mine=false — לא מסונן לפי משתמש', async () => {
    const adapter = createMockAdapter()
    const parsed = searchCustNotesSchema.parse({ q: '', mine: false, limit: 50 })
    const hits = await searchCustNotes(adapter, me, parsed)
    const distinctHandlers = new Set(hits.map((n) => n.handlerEmpId))
    expect(distinctHandlers.size).toBeGreaterThan(1)
  })

  it('סטטוס לא חוקי נדחה בסכימה', () => {
    expect(() => searchCustNotesSchema.parse({ status: ['לא-קיים'] })).toThrow()
  })

  it('limit עד 2000 מותר (תצוגת "לפי אדם"), מעל זה נדחה', () => {
    expect(searchCustNotesSchema.parse({ limit: 2000 }).limit).toBe(2000)
    expect(() => searchCustNotesSchema.parse({ limit: 2001 })).toThrow()
  })
})

describe('getCustNoteDetail action', () => {
  it('מחזיר פרטי משימה', async () => {
    const adapter = createMockAdapter()
    const detail = await getCustNoteDetail(adapter, me, 5001)
    expect(detail?.subject).toContain('הטמעה')
  })
})

describe('updateCustNote action', () => {
  it('מעדכן סטטוס תקין', async () => {
    const adapter = createMockAdapter()
    const parsed = updateCustNoteSchema.parse({ status: 'בוצעה' })
    const updated = await updateCustNote(adapter, me, 5001, parsed)
    expect(updated.statDes).toBe('בוצעה')
  })

  it('סטטוס לא חוקי נדחה בסכימה', () => {
    expect(() => updateCustNoteSchema.parse({ status: 'לא-קיים' })).toThrow()
  })

  it('עדיפות מחוץ לטווח נדחית', () => {
    expect(() => updateCustNoteSchema.parse({ priority: 150 })).toThrow()
  })
})

describe('createCustNote action', () => {
  const base = { custName: 'P-100', subject: 'משימה חדשה' }

  it('בלי handlerEmpId — המשימה משויכת ליוצר', async () => {
    const adapter = createMockAdapter()
    const created = await createCustNote(adapter, me, createCustNoteSchema.parse(base))
    expect(created.handlerEmpId).toBe('42')
  })

  it('עם handlerEmpId — המשימה משויכת לעובד שנבחר, לא ליוצר', async () => {
    const adapter = createMockAdapter()
    const created = await createCustNote(adapter, me, createCustNoteSchema.parse({ ...base, handlerEmpId: '99' }))
    expect(created.handlerEmpId).toBe('99')
  })

  it('handlerEmpId ריק נדחה', () => {
    expect(() => createCustNoteSchema.parse({ ...base, handlerEmpId: '' })).toThrow()
  })
})

describe('listEmployees action', () => {
  it('מחזיר רק שם ומזהה — לא טלפון/totp', async () => {
    const db = createLocalDb('__nonexistent__')
    await db.upsertEmployee({ phone: '0501111111', email: 'a@test.co', priorityEmpId: '42', name: 'אלעד' })
    const employees = await listEmployees(db, me)
    expect(employees).toEqual([{ priorityEmpId: '42', name: 'אלעד' }])
  })
})
