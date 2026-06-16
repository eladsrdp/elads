// טיפוסים משותפים בין השרת לקליינט.

/** המשתמש המחובר (תוכן ה-session). */
export interface Me {
  phone: string
  name: string
  priorityEmpId: string
}

/** משימה כפי שחוזרת מחיפוש בפריוריטי. */
export interface TaskSummary {
  id: string
  name: string
  projectId: string
  projectName: string
  status?: string
}

/** מסך בן — תקציר משימה מלא. */
export interface TaskDetail extends TaskSummary {
  description?: string
  openDate?: string
  dueDate?: string
  owner?: string
  hoursReported?: number
}

export interface CreateTaskInput {
  projectId: string
  name: string
  description?: string
}

/** אתר/יעד של לקוח (DCODE) — חלק מהלקוחות (למשל פיק אנד פאק) דורשים אתר בדיווח. */
export interface ProjectSite {
  code: string // DCODE — הקוד שנשלח בדיווח (למשל "01")
  name: string // תאור האתר (למשל "פיק פק")
}

/** משימת לקוח (CUSTNOTESA) — רשומת יומן/משימה בפריוריטי. מזהה = CUSTNOTE (Int64). */
export interface CustNote {
  id: number         // CUSTNOTE
  subject: string    // SUBJECT — כותרת המשימה (עד 52 תווים)
  custName: string   // CUSTNAME — קוד הלקוח
  custDes: string    // CUSTDES — שם הלקוח
  statDes?: string   // STATDES — סטטוס
  tillDate?: string  // TILLDATE — תאריך יעד (YYYY-MM-DD)
  projDocNo?: string // PROJDOCNO — פרויקט מקושר
  hoursReported?: number // ZRDP_HOURS
}

export interface CreateCustNoteInput {
  subject: string
  custName: string
  userLogin: string
  projDocNo?: string
  tillDate?: string // YYYY-MM-DD
}

/** דיווח שעות אחד שנשלח לסנכרון. clientId = UUID שנוצר בקליינט. */
export interface TimeEntryInput {
  clientId: string
  taskId: string
  date: string // YYYY-MM-DD
  durationMin: number
  startTime?: string // HH:MM
  endTime?: string // HH:MM
  note?: string
  ordName?: string   // מספר הזמנה (ORDNAME) — נדרש בחלק מהלקוחות
  ordLine?: number   // שורת ההזמנה (OLINE) — ברירת מחדל: לא נשלח
  billable?: boolean // לחיוב (FLAG="Y") — ברירת מחדל: לא מסומן
  dcode?: string     // אתר/יעד (DCODE) — נדרש בחלק מהלקוחות (פיק אנד פאק)
  custnoteId?: number // CUSTNOTE — מזהה המשימה המקושרת (CUSTNOTESA), אופציונלי
}

/** תוצאת סנכרון פר-פריט — כשל של פריט אחד לא מפיל את האחרים. */
export interface SyncItemResult {
  clientId: string
  ok: boolean
  priorityRef?: string
  error?: string
}

/** דיווח שעות כפי שנקרא חזרה מפריוריטי. */
export interface RemoteTimeEntry {
  priorityRef: string
  taskId: string
  taskName: string
  projectName?: string
  date: string
  durationMin: number
  note?: string
}
