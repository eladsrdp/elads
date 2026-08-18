// שכבת הפעולות — כל פעולה: zod schema + handler.
// ה-routes קוראים לכאן, ובשלב הצ'אט (Phase 3) אותם schemas ישמשו
// כ-tool definitions ל-LLM ואותם handlers יבצעו — בלי refactor.
import { z } from 'zod'
import type { Me, SyncItemResult } from '@priority-lite/shared'
import { TASK_STATUSES } from '@priority-lite/shared'
import type { AppDB } from '../db/db'
import type { PriorityAdapter } from '../priority/adapter'

const dateRe = /^\d{4}-\d{2}-\d{2}$/
const timeRe = /^\d{2}:\d{2}$/

export const searchTasksSchema = z.object({
  q: z.string().default(''),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export async function searchTasks(
  adapter: PriorityAdapter,
  _me: Me,
  input: z.infer<typeof searchTasksSchema>,
) {
  return adapter.searchTasks(input.q, input.limit)
}

export const getTaskSchema = z.object({ id: z.string().min(1) })

export async function getTask(adapter: PriorityAdapter, _me: Me, input: z.infer<typeof getTaskSchema>) {
  return adapter.getTask(input.id)
}

export const createTaskSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
})

export async function createTask(
  adapter: PriorityAdapter,
  _me: Me,
  input: z.infer<typeof createTaskSchema>,
) {
  return adapter.createTask(input)
}

export const reportTimeSchema = z.object({
  clientId: z.string().min(1),
  taskId: z.string().min(1),
  date: z.string().regex(dateRe),
  durationMin: z.number().int().min(1).max(24 * 60),
  startTime: z.string().regex(timeRe).optional(),
  endTime: z.string().regex(timeRe).optional(),
  note: z.string().max(500).optional(),
  ordName: z.string().max(50).optional(),
  ordLine: z.number().int().min(1).optional(),
  billable: z.boolean().optional(),
  dcode: z.string().max(20).optional(),
  custnoteId: z.number().int().positive().optional(), // CUSTNOTE — FK למשימה (Int64)
})

/** דיווח בודד — כשל הופך לתוצאת שגיאה פר-פריט במקום exception. */
export async function reportTime(
  adapter: PriorityAdapter,
  me: Me,
  input: z.infer<typeof reportTimeSchema>,
): Promise<SyncItemResult> {
  try {
    const { priorityRef } = await adapter.createTimeEntry({
      priorityEmpId: me.priorityEmpId,
      taskId: input.taskId,
      date: input.date,
      durationMin: input.durationMin,
      startTime: input.startTime,
      endTime: input.endTime,
      note: input.note,
      ordName: input.ordName,
      ordLine: input.ordLine,
      billable: input.billable,
      dcode: input.dcode,
      custnoteId: input.custnoteId,
    })
    return { clientId: input.clientId, ok: true, priorityRef }
  } catch (err) {
    return {
      clientId: input.clientId,
      ok: false,
      error: err instanceof Error ? err.message : 'שגיאה לא ידועה',
    }
  }
}

export const listSitesSchema = z.object({ customerId: z.string().min(1) })

/** אתרי הלקוח (DCODE) — לבורר אתרים בקליינט. */
export async function listSites(
  adapter: PriorityAdapter,
  _me: Me,
  input: z.infer<typeof listSitesSchema>,
) {
  return adapter.listSites(input.customerId)
}

export const listCustNotesSchema = z.object({ custName: z.string().min(1) })

export async function listCustNotes(adapter: PriorityAdapter, _me: Me, input: z.infer<typeof listCustNotesSchema>) {
  return adapter.listCustNotes(input.custName)
}

export const createCustNoteSchema = z.object({
  custName: z.string().min(1),
  subject: z.string().min(2).max(52),
  projDocNo: z.string().optional(),
  tillDate: z.string().regex(dateRe).optional(),
})

export async function createCustNote(adapter: PriorityAdapter, me: Me, input: z.infer<typeof createCustNoteSchema>) {
  return adapter.createCustNote({ ...input, userLogin: me.priorityEmpId })
}

export const getTimeEntriesSchema = z.object({
  from: z.string().regex(dateRe),
  to: z.string().regex(dateRe),
})

export async function getTimeEntries(
  adapter: PriorityAdapter,
  me: Me,
  input: z.infer<typeof getTimeEntriesSchema>,
) {
  return adapter.getTimeEntries(me.priorityEmpId, input.from, input.to)
}

export const searchCustNotesSchema = z.object({
  q: z.string().default(''),
  mine: z.boolean().default(false),
  status: z.array(z.enum([...TASK_STATUSES])).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

/** חיפוש משימות לקוח — "mine" ממופה ל-handlerEmpId (הסינון בפועל הוא לפי "לטיפול"). */
export async function searchCustNotes(
  adapter: PriorityAdapter,
  me: Me,
  input: z.infer<typeof searchCustNotesSchema>,
) {
  return adapter.searchCustNotes(
    input.q,
    { handlerEmpId: input.mine ? me.priorityEmpId : undefined, status: input.status },
    input.limit,
  )
}

export async function getCustNoteDetail(adapter: PriorityAdapter, _me: Me, id: number) {
  return adapter.getCustNoteDetail(id)
}

export const updateCustNoteSchema = z.object({
  status: z.enum([...TASK_STATUSES]).optional(),
  priority: z.number().int().min(0).max(99).optional(),
  tillDate: z.string().regex(dateRe).optional(),
  handlerEmpId: z.string().min(1).optional(),
  description: z.string().min(1).max(2000).optional(),
})

/** עדכון משימה — שולח רק את השדות שהוגדרו ב-input. */
export async function updateCustNote(
  adapter: PriorityAdapter,
  _me: Me,
  id: number,
  input: z.infer<typeof updateCustNoteSchema>,
) {
  return adapter.updateCustNote(id, input)
}

/**
 * רשימת עובדי priority-lite לבורר "לטיפול". SECURITY: לא חושף טלפון/totp_secret.
 * לוקח `db` ולא `adapter` — בכוונה: אין כאן תלות בפריוריטי, רק ב-AppDB המקומי.
 */
export async function listEmployees(db: AppDB, _me: Me) {
  const rows = await db.listActiveEmployees()
  return rows.map((r) => ({ priorityEmpId: r.priority_emp_id, name: r.name }))
}
