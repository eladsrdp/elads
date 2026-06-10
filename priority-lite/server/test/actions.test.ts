// בדיקות שכבת הפעולות מול ה-mock adapter — כולל מסלול הכשל.
import { describe, expect, it } from 'vitest'
import type { Me } from '@priority-lite/shared'
import { getTask, getTimeEntries, reportTime, searchTasks } from '../src/actions'
import { createMockAdapter } from '../src/priority/mock'

const me: Me = { phone: '0501234567', name: 'אלעד', priorityEmpId: '42' }

describe('searchTasks', () => {
  it('חיפוש ריק מחזיר משימות', async () => {
    const adapter = createMockAdapter()
    const tasks = await searchTasks(adapter, me, { q: '', limit: 20 })
    expect(tasks.length).toBeGreaterThan(0)
    expect(tasks[0]).toHaveProperty('projectName')
  })

  it('חיפוש בעברית מסנן לפי שם', async () => {
    const adapter = createMockAdapter()
    const tasks = await searchTasks(adapter, me, { q: 'פורטל', limit: 20 })
    expect(tasks.length).toBeGreaterThan(0)
    for (const t of tasks) {
      expect(t.name.includes('פורטל') || t.projectName.includes('פורטל')).toBe(true)
    }
  })
})

describe('getTask', () => {
  it('מחזיר מסך בן עם תיאור', async () => {
    const adapter = createMockAdapter()
    const detail = await getTask(adapter, me, { id: 'T-1001' })
    expect(detail?.name).toContain('אפיון')
    expect(detail?.description).toBeTruthy()
  })

  it('מחזיר null למשימה לא קיימת', async () => {
    const adapter = createMockAdapter()
    expect(await getTask(adapter, me, { id: 'T-9999' })).toBeNull()
  })
})

describe('reportTime', () => {
  const entry = {
    clientId: 'uuid-1',
    taskId: 'T-1001',
    date: '2026-06-10',
    durationMin: 90,
    note: 'אפיון מסכים',
  }

  it('דיווח מוצלח מחזיר priorityRef וניתן לקריאה חזרה', async () => {
    const adapter = createMockAdapter()
    const result = await reportTime(adapter, me, entry)
    expect(result.ok).toBe(true)
    expect(result.priorityRef).toMatch(/^LD-/)

    const list = await getTimeEntries(adapter, me, { from: '2026-06-01', to: '2026-06-30' })
    expect(list).toHaveLength(1)
    expect(list[0].durationMin).toBe(90)
    expect(list[0].taskName).toContain('אפיון')
  })

  it('דיווחים של עובד אחר לא מוחזרים', async () => {
    const adapter = createMockAdapter()
    await reportTime(adapter, me, entry)
    const other: Me = { ...me, priorityEmpId: '77' }
    const list = await getTimeEntries(adapter, other, { from: '2026-06-01', to: '2026-06-30' })
    expect(list).toHaveLength(0)
  })

  it('כשל הופך לתוצאת שגיאה פר-פריט (לא exception)', async () => {
    const adapter = createMockAdapter({ failRate: 1 })
    const result = await reportTime(adapter, me, entry)
    expect(result.ok).toBe(false)
    expect(result.clientId).toBe('uuid-1')
    expect(result.error).toContain('נסה שוב')
  })

  it('משימה לא קיימת מחזירה שגיאה ברורה', async () => {
    const adapter = createMockAdapter()
    const result = await reportTime(adapter, me, { ...entry, taskId: 'T-0000' })
    expect(result.ok).toBe(false)
    expect(result.error).toContain('לא נמצאה')
  })
})
