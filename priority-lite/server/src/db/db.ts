// SQLite — whitelist עובדים + קודי OTP. better-sqlite3: סינכרוני ומהיר, בלי שרת DB.
import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export type DB = Database.Database

export function createDb(path: string): DB {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      phone            TEXT PRIMARY KEY,
      email            TEXT NOT NULL,
      priority_emp_id  TEXT NOT NULL,
      name             TEXT NOT NULL,
      active           INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS otp_codes (
      phone          TEXT PRIMARY KEY,
      code_hash      TEXT NOT NULL,
      expires_at     INTEGER NOT NULL,
      attempts       INTEGER NOT NULL DEFAULT 0,
      sent_count     INTEGER NOT NULL DEFAULT 1,
      window_start   INTEGER NOT NULL
    );
  `)
  return db
}

export interface EmployeeRow {
  phone: string
  email: string
  priority_emp_id: string
  name: string
  active: number
}

export function findEmployee(db: DB, phone: string): EmployeeRow | undefined {
  return db
    .prepare('SELECT * FROM employees WHERE phone = ? AND active = 1')
    .get(phone) as EmployeeRow | undefined
}

export function upsertEmployee(
  db: DB,
  e: { phone: string; email: string; priorityEmpId: string; name: string; active?: boolean },
): void {
  db.prepare(
    `INSERT INTO employees (phone, email, priority_emp_id, name, active)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(phone) DO UPDATE SET
       email = excluded.email, priority_emp_id = excluded.priority_emp_id,
       name = excluded.name, active = excluded.active`,
  ).run(e.phone, e.email, e.priorityEmpId, e.name, e.active === false ? 0 : 1)
}
