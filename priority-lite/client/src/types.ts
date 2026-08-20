// טיפוסי הקליינט — מייצא את המשותפים ומוסיף את מודל הטיוטות המקומי.
export type {
  ChecklistItem,
  CreateChecklistItemInput,
  CreateCustNoteInput,
  CreateDraftInput,
  CreateTaskInput,
  CustNote,
  DraftNote,
  EmployeeSummary,
  Me,
  ProjectSite,
  RemoteTimeEntry,
  SearchCustNotesOptions,
  SyncItemResult,
  TaskDetail,
  TaskStatus,
  TaskStatusLogEntry,
  TaskSummary,
  TimeEntryInput,
  UpdateChecklistItemInput,
  UpdateCustNoteInput,
} from '@priority-lite/shared'
export { TASK_STATUSES } from '@priority-lite/shared'

export type EntryStatus = 'draft' | 'pending' | 'synced' | 'error'

/** דיווח שעות מקומי — נולד כטיוטה, מסונכרן לפריוריטי רק אחרי אישור המשתמש. */
export interface LocalTimeEntry {
  id: string // UUID — משמש גם כ-clientId בסנכרון
  status: EntryStatus
  date: string // YYYY-MM-DD
  taskId: string
  taskName: string
  projectName: string
  durationMin: number
  startTime?: string // HH:MM
  endTime?: string // HH:MM
  note?: string
  ordName?: string    // מספר הזמנה — נדרש בפיק אנד פאק, שחר וכו'
  ordLine?: number    // שורת ההזמנה
  billable?: boolean  // לחיוב
  dcode?: string      // אתר/יעד (DCODE) — נדרש בחלק מהלקוחות
  siteName?: string   // תאור האתר — לתצוגה בלבד
  custnoteId?: number // CUSTNOTE — FK למשימת הלקוח (CUSTNOTESA), אופציונלי
  custnoteName?: string // SUBJECT של המשימה — לתצוגה בלבד
  source: 'timer' | 'manual'
  priorityRef?: string
  syncError?: string
  createdAt: number
}
