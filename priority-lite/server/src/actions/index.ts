// שכבת הפעולות — כל פעולה: zod schema + handler.
// ה-routes קוראים לכאן, ובשלב הצ'אט (Phase 3) אותם schemas ישמשו
// כ-tool definitions ל-LLM ואותם handlers יבצעו — בלי refactor.
import { z } from 'zod'
import type { Me, SyncItemResult } from '@priority-lite/shared'
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
