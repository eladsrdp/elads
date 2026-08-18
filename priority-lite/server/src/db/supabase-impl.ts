// מימוש Supabase של AppDB — לסביבת ענן (Vercel).
import { createClient } from '@supabase/supabase-js'
import type { AppDB, ChecklistItemRow, DraftRow, EmployeeRow, OtpRow } from './interface'

export function createSupabaseDb(url: string, serviceKey: string): AppDB {
  // Node.js 20 has no native WebSocket. We don't use Supabase Realtime (DB queries only),
  // so provide a no-op transport to bypass the WebSocket check at client init time.
  // SECURITY: service_role key never logged; auth.persistSession false for serverless.
  class NoopWs {
    constructor(_url: string) {}
    close() {}
    send() {}
  }
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    realtime: { transport: NoopWs as any },
  })

  return {
    async ping() {
      // HEAD count בלבד — נוגע ב-DB (מונע auto-pause) בעלות מינימלית, בלי להחזיר שורות.
      const { error } = await client.from('employees').select('phone', { count: 'exact', head: true })
      if (error) throw new Error(`ping failed: ${error.message}`)
    },

    async listActiveEmployees() {
      const { data, error } = await client
        .from('employees')
        .select('phone, email, priority_emp_id, name, active, totp_secret')
        .eq('active', true)
        .order('name')
      if (error) throw new Error(`listActiveEmployees failed: ${error.message}`)
      return (data as EmployeeRow[]) ?? []
    },

    async findEmployee(phone) {
      const { data } = await client
        .from('employees')
        .select('phone, email, priority_emp_id, name, active, totp_secret')
        .eq('phone', phone)
        .eq('active', true)
        .maybeSingle()
      return (data as EmployeeRow) ?? undefined
    },

    async upsertEmployee(e) {
      const { error } = await client.from('employees').upsert({
        phone: e.phone,
        email: e.email,
        priority_emp_id: e.priorityEmpId,
        name: e.name,
        active: e.active !== false,
      })
      if (error) throw new Error(`upsertEmployee failed: ${error.message}`)
    },

    async setTotpSecret(phone, secret) {
      const { error } = await client.from('employees').update({ totp_secret: secret }).eq('phone', phone)
      if (error) throw new Error(`setTotpSecret failed: ${error.message}`)
    },

    async getOtpRow(phone) {
      const { data } = await client
        .from('otp_codes')
        .select('*')
        .eq('phone', phone)
        .maybeSingle()
      return (data as OtpRow) ?? undefined
    },

    async upsertOtp(row) {
      const { error } = await client.from('otp_codes').upsert(row)
      if (error) throw new Error(`upsertOtp failed: ${error.message}`)
    },

    async updateOtpAttempts(phone, attempts) {
      await client.from('otp_codes').update({ attempts }).eq('phone', phone)
    },

    async deleteOtp(phone) {
      await client.from('otp_codes').delete().eq('phone', phone)
    },

    async listChecklistItems(phone, taskId) {
      let q = client.from('local_checklist_items').select('*').eq('phone', phone).order('sort_order')
      q = taskId == null ? q.is('task_id', null) : q.eq('task_id', taskId)
      const { data, error } = await q
      if (error) throw new Error(`listChecklistItems failed: ${error.message}`)
      return (data as ChecklistItemRow[]) ?? []
    },

    async createChecklistItem(phone, taskId, text) {
      let maxQ = client
        .from('local_checklist_items')
        .select('sort_order')
        .eq('phone', phone)
        .order('sort_order', { ascending: false })
        .limit(1)
      maxQ = taskId == null ? maxQ.is('task_id', null) : maxQ.eq('task_id', taskId)
      const { data: maxRows } = await maxQ
      const nextOrder = ((maxRows?.[0] as { sort_order: number } | undefined)?.sort_order ?? -1) + 1
      const { data, error } = await client
        .from('local_checklist_items')
        .insert({ phone, task_id: taskId, text, done: false, sort_order: nextOrder })
        .select()
        .single()
      if (error) throw new Error(`createChecklistItem failed: ${error.message}`)
      return data as ChecklistItemRow
    },

    async updateChecklistItem(phone, id, changes) {
      const { data, error } = await client
        .from('local_checklist_items')
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('phone', phone)
        .select()
        .maybeSingle()
      if (error) throw new Error(`updateChecklistItem failed: ${error.message}`)
      return (data as ChecklistItemRow) ?? undefined
    },

    async deleteChecklistItem(phone, id) {
      const { data, error } = await client
        .from('local_checklist_items')
        .delete()
        .eq('id', id)
        .eq('phone', phone)
        .select('id')
      if (error) throw new Error(`deleteChecklistItem failed: ${error.message}`)
      return (data?.length ?? 0) > 0
    },

    async reorderChecklistItems(phone, taskId, orderedIds) {
      let scopeQ = client.from('local_checklist_items').select('id').eq('phone', phone)
      scopeQ = taskId == null ? scopeQ.is('task_id', null) : scopeQ.eq('task_id', taskId)
      const { data: scopedRows, error: scopeErr } = await scopeQ
      if (scopeErr) throw new Error(`reorderChecklistItems failed: ${scopeErr.message}`)
      const scopedIds = new Set((scopedRows ?? []).map((r) => (r as { id: number }).id))
      const uniqueOrderedIds = new Set(orderedIds)
      // SECURITY/יציבות: בלי בדיקת כפילויות, מזהה כפול היה עובר את בדיקת האורך+חברות
      // ודורס sort_order של פריטים שונים לאותו ערך. ראה local-impl.ts לאותה הגנה.
      if (
        orderedIds.length !== scopedIds.size ||
        uniqueOrderedIds.size !== orderedIds.length ||
        !orderedIds.every((id) => scopedIds.has(id))
      ) {
        return false
      }
      const now = new Date().toISOString()
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await client
          .from('local_checklist_items')
          .update({ sort_order: i, updated_at: now })
          .eq('id', orderedIds[i])
          .eq('phone', phone)
        if (error) throw new Error(`reorderChecklistItems failed: ${error.message}`)
      }
      return true
    },

    async listDrafts(phone, taskId) {
      let q = client.from('local_drafts').select('*').eq('phone', phone).order('created_at')
      q = taskId == null ? q.is('task_id', null) : q.eq('task_id', taskId)
      const { data, error } = await q
      if (error) throw new Error(`listDrafts failed: ${error.message}`)
      return (data as DraftRow[]) ?? []
    },

    async createDraft(phone, taskId, text) {
      const { data, error } = await client.from('local_drafts').insert({ phone, task_id: taskId, text }).select().single()
      if (error) throw new Error(`createDraft failed: ${error.message}`)
      return data as DraftRow
    },

    async updateDraft(phone, id, text) {
      const { data, error } = await client
        .from('local_drafts')
        .update({ text, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('phone', phone)
        .select()
        .maybeSingle()
      if (error) throw new Error(`updateDraft failed: ${error.message}`)
      return (data as DraftRow) ?? undefined
    },

    async deleteDraft(phone, id) {
      const { data, error } = await client.from('local_drafts').delete().eq('id', id).eq('phone', phone).select('id')
      if (error) throw new Error(`deleteDraft failed: ${error.message}`)
      return (data?.length ?? 0) > 0
    },
  }
}
