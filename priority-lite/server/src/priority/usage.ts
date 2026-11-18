// ספירת קריאות לפריוריטי (טרנזקציות API) — נצברת בזיכרון ומתרוקנת ל-DB בסוף כל בקשת API.
// SECURITY: לא נשמר שום תוכן (גוף בקשה / פרמטרים / סודות) — רק יום, לוגין, שם ישות, שיטה ומונים.
import { AsyncLocalStorage } from 'node:async_hooks'
import type { PriorityUsageRow } from '@priority-lite/shared'

const userStore = new AsyncLocalStorage<{ empId: string }>()
const pending = new Map<string, PriorityUsageRow>()
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }) // YYYY-MM-DD

/** מריץ את fn כך שכל קריאה לפריוריטי בתוכו נרשמת על שם העובד. */
export function withUsageUser<T>(empId: string, fn: () => T): T {
  return userStore.run({ empId }, fn)
}

/** יום (שעון ישראל) כ-YYYY-MM-DD. */
export function israelDay(date: Date = new Date()): string {
  return dayFormat.format(date)
}

/**
 * שם הישות מנתיב OData:
 *   ZRDP_DOCUMENTS_p?$select=…                    → ZRDP_DOCUMENTS_p
 *   CUSTNOTESA(CUSTNOTE=5)/X_SUBFORM?$select=…    → CUSTNOTESA/X_SUBFORM
 */
export function entityFromPath(path: string): string {
  const m = path.split('?')[0].match(/^([A-Za-z0-9_]+)(?:\([^)]*\))?(?:\/([A-Za-z0-9_]+))?/)
  if (!m) return 'unknown'
  return m[2] ? `${m[1]}/${m[2]}` : m[1]
}

/** רושם קריאה אחת (ניסיון HTTP אחד — גם ניסיון חוזר נספר, כי הוא טרנזקציה בפריוריטי). */
export function recordPriorityCall(path: string, method: string, ok: boolean, now: Date = new Date()): void {
  const row: PriorityUsageRow = {
    day: israelDay(now),
    empId: userStore.getStore()?.empId ?? 'system',
    entity: entityFromPath(path),
    method: method.toUpperCase(),
    calls: 1,
    errors: ok ? 0 : 1,
  }
  const key = `${row.day}|${row.empId}|${row.entity}|${row.method}`
  const existing = pending.get(key)
  if (existing) {
    existing.calls += 1
    existing.errors += row.errors
  } else {
    pending.set(key, row)
  }
}

/** מחזיר את כל מה שנצבר ומאפס. */
export function drainUsage(): PriorityUsageRow[] {
  const rows = [...pending.values()]
  pending.clear()
  return rows
}

let lastWarnAt = 0

/**
 * שומר את הצבירה דרך `save`. כשל או timeout לא מפילים את הבקשה — רק אזהרה בלוג (לכל היותר פעם בדקה,
 * כדי שטבלה חסרה לא תציף את הלוגים).
 */
export async function flushUsage(
  save: (rows: PriorityUsageRow[]) => Promise<void>,
  timeoutMs = 1500,
): Promise<void> {
  const rows = drainUsage()
  if (rows.length === 0) return
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      Promise.resolve().then(() => save(rows)),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, timeoutMs)
      }),
    ])
  } catch (err) {
    if (Date.now() - lastWarnAt > 60_000) {
      lastWarnAt = Date.now()
      console.warn('[usage] שמירת ספירת השימוש נכשלה:', err instanceof Error ? err.message : err)
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}
