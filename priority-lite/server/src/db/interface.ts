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
}

export interface AppDB {
  findEmployee(phone: string): Promise<EmployeeRow | undefined>
  upsertEmployee(e: {
    phone: string
    email: string
    priorityEmpId: string
    name: string
    active?: boolean
  }): Promise<void>
  getOtpRow(phone: string): Promise<OtpRow | undefined>
  upsertOtp(row: OtpRow): Promise<void>
  updateOtpAttempts(phone: string, attempts: number): Promise<void>
  deleteOtp(phone: string): Promise<void>
}
