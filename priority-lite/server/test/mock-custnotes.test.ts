import { describe, expect, it } from 'vitest'
import { createMockAdapter } from '../src/priority/mock'

describe('searchCustNotes (mock)', () => {
  it('בלי פילטרים — מחזיר משימות מכמה לקוחות שונים', async () => {
    const adapter = createMockAdapter()
    const all = await adapter.searchCustNotes('', {})
    const distinctCustomers = new Set(all.map((n) => n.custName))
    expect(distinctCustomers.size).toBeGreaterThan(2)
  })

  it('פילטר handlerEmpId — "המשימות שלי"', async () => {
    const adapter = createMockAdapter()
    const mine = await adapter.searchCustNotes('', { handlerEmpId: '42' })
    expect(mine.length).toBeGreaterThan(0)
    for (const n of mine) expect(n.handlerEmpId).toBe('42')
  })

  it('פילטר סטטוס', async () => {
    const adapter = createMockAdapter()
    const hits = await adapter.searchCustNotes('', { status: ['בוצעה'] })
    expect(hits.length).toBeGreaterThan(0)
    for (const n of hits) expect(n.statDes).toBe('בוצעה')
  })

  it('חיפוש טקסט חופשי לפי נושא', async () => {
    const adapter = createMockAdapter()
    const hits = await adapter.searchCustNotes('גיבוי', {})
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].subject).toContain('גיבוי')
  })

  it('כל משימה כוללת תאריך פתיחה (YYYY-MM-DD)', async () => {
    const adapter = createMockAdapter()
    const all = await adapter.searchCustNotes('', {})
    for (const n of all) expect(n.openDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('יש לפחות משימה אחת ללא שיוך — לבדיקת קבוצת "ללא שיוך"', async () => {
    const adapter = createMockAdapter()
    const all = await adapter.searchCustNotes('', {})
    expect(all.some((n) => !n.handlerEmpId)).toBe(true)
  })
})

describe('listCustNotes (mock)', () => {
  it('מחזיר handlerEmpId ו-openDate — נדרש לסינון "שלי" בבורר דיווח השעות', async () => {
    const adapter = createMockAdapter()
    const notes = await adapter.listCustNotes('P-100')
    expect(notes.length).toBeGreaterThan(0)
    expect(notes.some((n) => n.handlerEmpId === '42')).toBe(true)
    for (const n of notes) expect(n.openDate).toBeTruthy()
  })
})

describe('createCustNote (mock)', () => {
  it('משימה חדשה מקבלת תאריך פתיחה של היום', async () => {
    const adapter = createMockAdapter()
    const created = await adapter.createCustNote({ subject: 'בדיקה', custName: 'P-100', userLogin: '42' })
    expect(created.openDate).toBe(new Date().toISOString().slice(0, 10))
  })
})

describe('getCustNoteDetail (mock)', () => {
  it('מחזיר תיאור והיסטוריה', async () => {
    const adapter = createMockAdapter()
    const detail = await adapter.getCustNoteDetail(5001)
    expect(detail?.description).toBeTruthy()
    expect(detail?.history?.length).toBeGreaterThan(0)
  })

  it('מזהה לא קיים — מחזיר null', async () => {
    const adapter = createMockAdapter()
    expect(await adapter.getCustNoteDetail(999999)).toBeNull()
  })
})

describe('updateCustNote (mock)', () => {
  it('מעדכן סטטוס ומחזיר את הרשומה המעודכנת', async () => {
    const adapter = createMockAdapter()
    const updated = await adapter.updateCustNote(5001, { status: 'בוצעה' })
    expect(updated.statDes).toBe('בוצעה')
    const reread = await adapter.searchCustNotes('', {})
    expect(reread.find((n) => n.id === 5001)?.statDes).toBe('בוצעה')
  })

  it('מעדכן לטיפול', async () => {
    const adapter = createMockAdapter()
    const updated = await adapter.updateCustNote(5002, { handlerEmpId: '77' })
    expect(updated.handlerEmpId).toBe('77')
  })

  it('משימה לא קיימת — זורק שגיאה', async () => {
    const adapter = createMockAdapter()
    await expect(adapter.updateCustNote(999999, { status: 'בוצעה' })).rejects.toThrow()
  })
})
