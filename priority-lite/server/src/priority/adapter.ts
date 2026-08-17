// התפר המרכזי — כל גישה לפריוריטי עוברת דרך הממשק הזה.
// שני מימושים: mock (פיתוח) ו-odata (אמיתי).
import type {
  CreateCustNoteInput,
  CreateTaskInput,
  CustNote,
  ProjectSite,
  RemoteTimeEntry,
  SearchCustNotesOptions,
  TaskDetail,
  TaskSummary,
  UpdateCustNoteInput,
} from '@priority-lite/shared'

export interface NewTimeEntry {
  priorityEmpId: string
  taskId: string
  date: string // YYYY-MM-DD
  durationMin: number
  startTime?: string  // HH:MM
  endTime?: string    // HH:MM
  note?: string
  ordName?: string    // ORDNAME — נדרש בחלק מהלקוחות
  ordLine?: number    // OLINE
  billable?: boolean  // FLAG="Y"
  dcode?: string      // DCODE — אתר/יעד, נדרש בחלק מהלקוחות
  custnoteId?: number // CUSTNOTE — FK למשימת הלקוח (Int64), אופציונלי
}

export interface PriorityAdapter {
  searchTasks(q: string, limit?: number): Promise<TaskSummary[]>
  getTask(id: string): Promise<TaskDetail | null>
  createTask(input: CreateTaskInput): Promise<TaskSummary>
  createTimeEntry(entry: NewTimeEntry): Promise<{ priorityRef: string }>
  getTimeEntries(priorityEmpId: string, from: string, to: string): Promise<RemoteTimeEntry[]>
  /** אתרי הלקוח (DCODE) לפי מספר לקוח (CUSTNAME = TaskSummary.projectId) */
  listSites(customerId: string): Promise<ProjectSite[]>
  /** משימות פתוחות לפי לקוח (CUSTNOTESA עם CLOSED='N') */
  listCustNotes(custName: string): Promise<CustNote[]>
  /** יצירת משימת לקוח חדשה ב-CUSTNOTESA */
  createCustNote(input: CreateCustNoteInput): Promise<CustNote>
  /** חיפוש גלובלי במשימות לקוח על פני כל החברה — לא מוגבל ללקוח אחד. */
  searchCustNotes(query: string, opts: SearchCustNotesOptions, limit?: number): Promise<CustNote[]>
  /** פרטי משימה מלאים — כולל תיאור (CUSTNOTESTEXT_ONE) והיסטוריית סטטוס (DOCTODOLISTLOG). */
  getCustNoteDetail(id: number): Promise<CustNote | null>
  /** עדכון משימה — סטטוס/עדיפות/תאריך/לטיפול/תיאור. שולח רק שדות שהוגדרו ב-changes. */
  updateCustNote(id: number, changes: UpdateCustNoteInput): Promise<CustNote>
}
