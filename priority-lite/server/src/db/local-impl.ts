// מימוש Local של AppDB — in-memory לפיתוח מקומי.
// קורא עובדים מ-whitelist.json בהפעלה. OTP נשמר בזיכרון (נמחק ב-restart).
import { existsSync, readFileSync } from 'node:fs'
import type { AppDB, ChecklistItemRow, DraftRow, EmployeeRow, OtpRow } from './interface'

export function createLocalDb(whitelistPath = './whitelist.json'): AppDB {
  const employees = new Map<string, EmployeeRow>()
  const otps = new Map<string, OtpRow>()
  const checklistItems = new Map<number, ChecklistItemRow>()
  const drafts = new Map<number, DraftRow>()
  let checklistCounter = 0
  let draftCounter = 0

  if (existsSync(whitelistPath)) {
    try {
      const raw = JSON.parse(readFileSync(whitelistPath, 'utf8')) as Array<{
        phone: string
        email: string
        priorityEmpId: string
        name: string
        active?: boolean
      }>
      for (const e of raw) {
        employees.set(e.phone, {
          phone: e.phone,
          email: e.email,
          priority_emp_id: e.priorityEmpId,
          name: e.name,
          active: e.active !== false,
          totp_secret: null,
        })
      }
      console.log(`[local-db] ${employees.size} עובדים נטענו מ-${whitelistPath}`)
    } catch (err) {
      console.warn(`[local-db] נכשל בטעינת ${whitelistPath}:`, err)
    }
  } else {
    console.warn(`[local-db] ${whitelistPath} לא נמצא — אין עובדים`)
  }

  return {
    async ping() {
      // no-op — אין Supabase לשמור-על-חיים במצב local
    },

    async listActiveEmployees() {
      return [...employees.values()].filter((e) => e.active).sort((a, b) => a.name.localeCompare(b.name))
    },

    async findEmployee(phone) {
      const e = employees.get(phone)
      return e?.active ? e : undefined
    },

    async upsertEmployee(e) {
      const existing = employees.get(e.phone)
      employees.set(e.phone, {
        phone: e.phone,
        email: e.email,
        priority_emp_id: e.priorityEmpId,
        name: e.name,
        active: e.active !== false,
        totp_secret: existing?.totp_secret ?? null,
      })
    },

    async setTotpSecret(phone, secret) {
      const row = employees.get(phone)
      if (row) employees.set(phone, { ...row, totp_secret: secret })
    },

    async getOtpRow(phone) {
      return otps.get(phone)
    },

    async upsertOtp(row) {
      otps.set(row.phone, row)
    },

    async updateOtpAttempts(phone, attempts) {
      const row = otps.get(phone)
      if (row) otps.set(phone, { ...row, attempts })
    },

    async deleteOtp(phone) {
      otps.delete(phone)
    },

    async listChecklistItems(phone, taskId) {
      return [...checklistItems.values()]
        .filter((r) => r.phone === phone && r.task_id === taskId)
        .sort((a, b) => a.sort_order - b.sort_order)
    },

    async createChecklistItem(phone, taskId, text) {
      const scoped = [...checklistItems.values()].filter((r) => r.phone === phone && r.task_id === taskId)
      const maxOrder = scoped.reduce((max, r) => Math.max(max, r.sort_order), -1)
      const now = new Date().toISOString()
      const row: ChecklistItemRow = {
        id: ++checklistCounter,
        phone,
        task_id: taskId,
        text,
        done: false,
        sort_order: maxOrder + 1,
        created_at: now,
        updated_at: now,
      }
      checklistItems.set(row.id, row)
      return row
    },

    async updateChecklistItem(phone, id, changes) {
      const row = checklistItems.get(id)
      if (!row || row.phone !== phone) return undefined
      const updated = { ...row, ...changes, updated_at: new Date().toISOString() }
      checklistItems.set(id, updated)
      return updated
    },

    async deleteChecklistItem(phone, id) {
      const row = checklistItems.get(id)
      if (!row || row.phone !== phone) return false
      checklistItems.delete(id)
      return true
    },

    async reorderChecklistItems(phone, taskId, orderedIds) {
      const scoped = [...checklistItems.values()].filter((r) => r.phone === phone && r.task_id === taskId)
      const scopedIds = new Set(scoped.map((r) => r.id))
      const uniqueOrderedIds = new Set(orderedIds)
      // SECURITY/יציבות: בלי בדיקת כפילויות, [a.id, a.id] היה עובר את בדיקת האורך+חברות
      // ודורס את sort_order של שני הפריטים לאותו ערך (item a נכתב פעמיים, item b אף פעם).
      if (
        orderedIds.length !== scoped.length ||
        uniqueOrderedIds.size !== orderedIds.length ||
        !orderedIds.every((id) => scopedIds.has(id))
      ) {
        return false
      }
      const now = new Date().toISOString()
      orderedIds.forEach((id, idx) => {
        const row = checklistItems.get(id)
        if (row) checklistItems.set(id, { ...row, sort_order: idx, updated_at: now })
      })
      return true
    },

    async listDrafts(phone, taskId) {
      return [...drafts.values()]
        .filter((r) => r.phone === phone && r.task_id === taskId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    },

    async createDraft(phone, taskId, text) {
      const now = new Date().toISOString()
      const row: DraftRow = { id: ++draftCounter, phone, task_id: taskId, text, created_at: now, updated_at: now }
      drafts.set(row.id, row)
      return row
    },

    async updateDraft(phone, id, text) {
      const row = drafts.get(id)
      if (!row || row.phone !== phone) return undefined
      const updated = { ...row, text, updated_at: new Date().toISOString() }
      drafts.set(id, updated)
      return updated
    },

    async deleteDraft(phone, id) {
      const row = drafts.get(id)
      if (!row || row.phone !== phone) return false
      drafts.delete(id)
      return true
    },
  }
}
