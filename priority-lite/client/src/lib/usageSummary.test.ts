import { describe, expect, it } from 'vitest'
import type { PriorityUsageRow } from '../types'
import { entityLabel, summarizeUsage } from './usageSummary'

function row(over: Partial<PriorityUsageRow>): PriorityUsageRow {
  return { day: '2026-11-02', empId: 'elads', entity: 'CUSTNOTESA', method: 'GET', calls: 1, errors: 0, ...over }
}

describe('summarizeUsage', () => {
  it('מסכם סה"כ, שגיאות, לפי יום ולפי ישות', () => {
    const s = summarizeUsage(
      [
        row({ day: '2026-11-02', calls: 10, errors: 1 }),
        row({ day: '2026-11-02', entity: 'ZRDP_DOCUMENTS_p', calls: 5 }),
        row({ day: '2026-11-01', calls: 7, method: 'POST' }),
      ],
      {},
    )
    expect(s.total).toBe(22)
    expect(s.errors).toBe(1)
    expect(s.byDay).toEqual([
      { day: '2026-11-02', total: 15, errors: 1 },
      { day: '2026-11-01', total: 7, errors: 0 },
    ])
    expect(s.byEntity[0]).toMatchObject({ entity: 'CUSTNOTESA', calls: 17 })
    expect(s.byEntity[0].methods).toEqual({ GET: 10, POST: 7 })
  })

  it('סינון לפי עובד', () => {
    const rows = [row({ empId: 'elads', calls: 3 }), row({ empId: 'amitay', calls: 40 })]
    expect(summarizeUsage(rows, { empId: 'elads' }).total).toBe(3)
    expect(summarizeUsage(rows, {}).total).toBe(43)
  })

  it('ישויות ממוינות מהנפוצה לנדירה, ימים מהחדש לישן', () => {
    const s = summarizeUsage(
      [row({ entity: 'A', calls: 1, day: '2026-10-30' }), row({ entity: 'B', calls: 9, day: '2026-11-02' })],
      {},
    )
    expect(s.byEntity.map((e) => e.entity)).toEqual(['B', 'A'])
    expect(s.byDay.map((d) => d.day)).toEqual(['2026-11-02', '2026-10-30'])
  })

  it('בלי נתונים — אפסים', () => {
    expect(summarizeUsage([], {})).toEqual({ total: 0, errors: 0, byDay: [], byEntity: [] })
  })
})

describe('entityLabel', () => {
  it('שם עברי לישויות מוכרות, ושם גולמי לא מוכרות', () => {
    expect(entityLabel('ZRDP_DOCUMENTS_p')).toBe('פרויקטים')
    expect(entityLabel('CUSTNOTESA/CUSTNOTESTEXT_SUBFORM')).toBe('תקציר משימה')
    expect(entityLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW')
  })
})
