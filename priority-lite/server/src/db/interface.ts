// ממשק אחיד לשכבת ה-DB — מימושים: Supabase (ענן) ו-Local (in-memory לפיתוח).
export interface OtpRow {
  phone: string
  code_hash: string
  expires_at: number
  attempts: number
  sent_count: number
  window_start: number
}

export interface EmployeeRow {
  phone: string
  email: string
  priority_emp_id: string
  name: string
  active: boolean
  totp_secret: string | null
}

export interface ChecklistItemRow {
  id: number
  phone: string
  task_id: number | null
  text: string
  done: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface DraftRow {
  id: number
  phone: string
  task_id: number | null
  text: string
  created_at: string
  updated_at: string
}

export interface AppDB {
  /** בקשת שמירה-על-חיים — נוגעת ב-DB כדי למנוע auto-pause בפרויקטי Supabase free-tier. */
  ping(): Promise<void>
  /** כל העובדים הפעילים — לבורר "לטיפול" בניהול משימות. */
  listActiveEmployees(): Promise<EmployeeRow[]>
  findEmployee(phone: string): Promise<EmployeeRow | undefined>
  upsertEmployee(e: {
    phone: string
    email: string
    priorityEmpId: string
    name: string
    active?: boolean
  }): Promise<void>
  setTotpSecret(phone: string, secret: string): Promise<void>
  getOtpRow(phone: string): Promise<OtpRow | undefined>
  upsertOtp(row: OtpRow): Promise<void>
  updateOtpAttempts(phone: string, attempts: number): Promise<void>
  deleteOtp(phone: string): Promise<void>

  /** Phase 2 — צ'קליסט אישי, לא מסונכרן עם פריוריטי. */
  listChecklistItems(phone: string, taskId: number | null): Promise<ChecklistItemRow[]>
  createChecklistItem(phone: string, taskId: number | null, text: string): Promise<ChecklistItemRow>
  /** מחזיר undefined אם הפריט לא קיים או לא שייך ל-phone הנתון. */
  updateChecklistItem(
    phone: string,
    id: number,
    changes: { text?: string; done?: boolean },
  ): Promise<ChecklistItemRow | undefined>
  /** מחזיר false אם הפריט לא קיים או לא שייך ל-phone הנתון. */
  deleteChecklistItem(phone: string, id: number): Promise<boolean>
  /** מחזיר false אם orderedIds לא תואם בדיוק לפריטים הקיימים בסקופ (phone+taskId). */
  reorderChecklistItems(phone: string, taskId: number | null, orderedIds: number[]): Promise<boolean>

  /** Phase 2 — טיוטות חופשיות אישיות, לא מסונכרנות עם פריוריטי. */
  listDrafts(phone: string, taskId: number | null): Promise<DraftRow[]>
  createDraft(phone: string, taskId: number | null, text: string): Promise<DraftRow>
  updateDraft(phone: string, id: number, text: string): Promise<DraftRow | undefined>
  deleteDraft(phone: string, id: number): Promise<boolean>
}
