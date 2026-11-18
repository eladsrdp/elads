// סיכום ספירת הקריאות לפריוריטי (PriorityUsageRow) לתצוגה בהגדרות.
import type { PriorityUsageRow } from '../types'

export interface UsageSummary {
  total: number
  errors: number
  byDay: { day: string; total: number; errors: number }[] // מהחדש לישן
  byEntity: { entity: string; calls: number; methods: Record<string, number> }[] // מהנפוצה לנדירה
}

/** סיכום שורות השימוש. `empId` מסנן לעובד אחד; בלעדיו — כולם. */
export function summarizeUsage(rows: PriorityUsageRow[], opts: { empId?: string }): UsageSummary {
  const scoped = opts.empId ? rows.filter((r) => r.empId === opts.empId) : rows
  const days = new Map<string, { total: number; errors: number }>()
  const entities = new Map<string, { calls: number; methods: Record<string, number> }>()
  let total = 0
  let errors = 0

  for (const r of scoped) {
    total += r.calls
    errors += r.errors
    const d = days.get(r.day) ?? { total: 0, errors: 0 }
    d.total += r.calls
    d.errors += r.errors
    days.set(r.day, d)
    const e = entities.get(r.entity) ?? { calls: 0, methods: {} }
    e.calls += r.calls
    e.methods[r.method] = (e.methods[r.method] ?? 0) + r.calls
    entities.set(r.entity, e)
  }

  return {
    total,
    errors,
    byDay: [...days.entries()].map(([day, v]) => ({ day, ...v })).sort((a, b) => b.day.localeCompare(a.day)),
    byEntity: [...entities.entries()].map(([entity, v]) => ({ entity, ...v })).sort((a, b) => b.calls - a.calls),
  }
}

const ENTITY_LABELS: Record<string, string> = {
  ZRDP_DOCUMENTS_p: 'פרויקטים',
  ZRDP_TRANSORDER_q: 'דיווחי שעות',
  CUSTOMERS: 'לקוחות',
  'CUSTOMERS/CUSTDESTS_SUBFORM': 'אתרי לקוח',
  CUSTNOTESA: 'משימות',
  'CUSTNOTESA/CUSTNOTESTEXT_SUBFORM': 'תקציר משימה',
  'CUSTNOTESA/INTERNALDIALOGTEXT_SUBFORM': 'דו שיח פנימי',
  'CUSTNOTESA/DOCTODOLISTLOG_SUBFORM': 'לוג סטטוסים',
}

/** שם עברי לישות של פריוריטי; ישות לא מוכרת מוצגת כפי שהיא. */
export function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity
}
