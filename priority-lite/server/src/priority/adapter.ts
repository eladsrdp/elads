// התפר המרכזי — כל גישה לפריוריטי עוברת דרך הממשק הזה.
// שני מימושים: mock (פיתוח) ו-odata (אמיתי).
import type {
  CreateTaskInput,
  RemoteTimeEntry,
  TaskDetail,
  TaskSummary,
} from '@priority-lite/shared'

export interface NewTimeEntry {
  priorityEmpId: string
  taskId: string
  date: string // YYYY-MM-DD
  durationMin: number
  startTime?: string // HH:MM
  endTime?: string // HH:MM
  note?: string
}

export interface PriorityAdapter {
  searchTasks(q: string, limit?: number): Promise<TaskSummary[]>
  getTask(id: string): Promise<TaskDetail | null>
  createTask(input: CreateTaskInput): Promise<TaskSummary>
  createTimeEntry(entry: NewTimeEntry): Promise<{ priorityRef: string }>
  getTimeEntries(priorityEmpId: string, from: string, to: string): Promise<RemoteTimeEntry[]>
}
