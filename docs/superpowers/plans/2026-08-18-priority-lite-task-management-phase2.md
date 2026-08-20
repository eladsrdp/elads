# Priority Lite Task Management Phase 2 (Local Checklists & Drafts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local-only checklist items and free-form drafts, each optionally attached to
a Phase 1 Priority task or fully standalone, private per user, persisted in Supabase
(never sent to Priority), with a new "שלי" tab and a new section inside `TaskDetail`.

**Architecture:** Two new Supabase tables (`local_checklist_items`, `local_drafts`)
behind the existing `AppDB` interface (dual `local-impl.ts`/`supabase-impl.ts`
implementation), a zod-based actions layer that scopes every operation by `me.phone`
(this replaces RLS as the access-control mechanism, matching how the rest of this app
already works), new Hono routes `/api/checklist` and `/api/drafts`, and client-side
`fetch`-based data layer + UI (new tab + a section reused inside `TaskDetail`). Drag
reorder for checklist items uses `@dnd-kit`.

**Tech Stack:** Hono, Zod, Supabase (`@supabase/supabase-js`), React 19, `@dnd-kit/core`
+ `@dnd-kit/sortable` (new dependency), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-18-priority-lite-task-management-phase2-design.md`

**IMPORTANT — typecheck command:** `shared/` has no `tsconfig.json` of its own — it is
type-checked only through its consumers. Running `npx tsc -p shared --noEmit` always
fails with `TS5057` regardless of whether the code is correct. **Always verify with
`npx tsc -p server --noEmit` and `npx tsc -p client --noEmit`** (run from the
`priority-lite/` directory) — never add or trust a `-p shared` typecheck step.

---

### Task 1: Shared types

**Files:**
- Modify: `priority-lite/shared/src/types.ts`

- [ ] **Step 1: Add the new types**

Add at the end of the file:

```ts
/** סעיף צ'קליסט אישי (Phase 2) — לא מסונכרן עם פריוריטי, פרטי למשתמש בלבד. */
export interface ChecklistItem {
  id: number
  taskId?: number // CUSTNOTE id מפריוריטי; חסר = פריט עצמאי
  text: string
  done: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CreateChecklistItemInput {
  taskId?: number
  text: string
}

export interface UpdateChecklistItemInput {
  text?: string
  done?: boolean
}

/** טיוטה חופשית אישית (Phase 2) — לא מסונכרנת עם פריוריטי, פרטית למשתמש בלבד. */
export interface DraftNote {
  id: number
  taskId?: number
  text: string
  createdAt: string
  updatedAt: string
}

export interface CreateDraftInput {
  taskId?: number
  text: string
}
```

- [ ] **Step 2: Typecheck**

Run (from `priority-lite/`): `npx tsc -p server --noEmit`
Expected: passes (nothing consumes the new types yet, so this just confirms the file
itself is syntactically valid TypeScript).

- [ ] **Step 3: Commit**

```bash
git add shared/src/types.ts
git commit -m "feat(priority-lite): add ChecklistItem/DraftNote shared types (Phase 2)"
```

---

### Task 2: DB interface additions + Supabase schema

**Files:**
- Modify: `priority-lite/server/src/db/interface.ts`
- Modify: `priority-lite/server/src/db/db.ts`
- Modify: `priority-lite/supabase-schema.sql`

- [ ] **Step 1: Add row types and methods to the `AppDB` interface**

In `priority-lite/server/src/db/interface.ts`, add after `EmployeeRow`:

```ts
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
```

Add to the `AppDB` interface body (after `deleteOtp`):

```ts
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
```

- [ ] **Step 2: Re-export the new row types from the factory module**

In `priority-lite/server/src/db/db.ts`, change the first line to:

```ts
export type { AppDB, EmployeeRow, OtpRow, ChecklistItemRow, DraftRow } from './interface'
```

- [ ] **Step 3: Add the Supabase schema**

Append to `priority-lite/supabase-schema.sql` (before the `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` lines, then add matching disables at the end):

```sql
CREATE TABLE IF NOT EXISTS local_checklist_items (
  id          BIGSERIAL PRIMARY KEY,
  phone       TEXT NOT NULL REFERENCES employees(phone),
  task_id     BIGINT,
  text        TEXT NOT NULL,
  done        BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS local_drafts (
  id          BIGSERIAL PRIMARY KEY,
  phone       TEXT NOT NULL REFERENCES employees(phone),
  task_id     BIGINT,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

And add to the RLS-disable block at the bottom of the file:

```sql
ALTER TABLE local_checklist_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE local_drafts DISABLE ROW LEVEL SECURITY;
```

This SQL file is documentation/setup-script only (matches how `employees`/`otp_codes`
already work) — it is not run automatically; the user runs it in the Supabase SQL
Editor when ready to use the real Supabase backend. `local-impl.ts` (Task 3) does not
need this SQL at all, since it is in-memory.

- [ ] **Step 4: Typecheck**

Run: `npx tsc -p server --noEmit`
Expected: FAILS — `local-impl.ts` and `supabase-impl.ts` no longer satisfy the `AppDB`
interface (missing methods). This is expected; fixed in Tasks 3–4.

- [ ] **Step 5: Commit**

```bash
git add server/src/db/interface.ts server/src/db/db.ts supabase-schema.sql
git commit -m "feat(priority-lite): add checklist/draft rows to AppDB interface + schema"
```

---

### Task 3: `local-impl.ts` implementation + DB-level tests

**Files:**
- Modify: `priority-lite/server/src/db/local-impl.ts`
- Create: `priority-lite/server/test/local-items.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `priority-lite/server/test/local-items.test.ts`:

```ts
// בדיקות ל-AppDB.local-impl עבור צ'קליסט/טיוטות מקומיים (Phase 2).
import { describe, expect, it } from 'vitest'
import { createLocalDb } from '../src/db/local-impl'

describe('checklist items (local db)', () => {
  it('יוצר ומחזיר פריט לפי phone+taskId', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await db.createChecklistItem('0501111111', 42, 'קנה חלב')
    expect(created.text).toBe('קנה חלב')
    expect(created.task_id).toBe(42)
    expect(created.done).toBe(false)

    const items = await db.listChecklistItems('0501111111', 42)
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(created.id)
  })

  it('taskId=null מבודד פריטים עצמאיים מפריטים משויכים', async () => {
    const db = createLocalDb('__nonexistent__')
    await db.createChecklistItem('0501111111', 42, 'משויך')
    await db.createChecklistItem('0501111111', null, 'עצמאי')
    expect(await db.listChecklistItems('0501111111', null)).toHaveLength(1)
    expect(await db.listChecklistItems('0501111111', 42)).toHaveLength(1)
  })

  it('משתמש אחר לא רואה פריטים של משתמש אחר', async () => {
    const db = createLocalDb('__nonexistent__')
    await db.createChecklistItem('0501111111', null, 'שלי')
    expect(await db.listChecklistItems('0502222222', null)).toHaveLength(0)
  })

  it('updateChecklistItem מחזיר undefined על פריט של משתמש אחר, ולא משנה אותו', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await db.createChecklistItem('0501111111', null, 'שלי')
    const result = await db.updateChecklistItem('0502222222', created.id, { done: true })
    expect(result).toBeUndefined()
    const items = await db.listChecklistItems('0501111111', null)
    expect(items[0].done).toBe(false)
  })

  it('deleteChecklistItem מחזיר false על פריט של משתמש אחר, ולא מוחק אותו', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await db.createChecklistItem('0501111111', null, 'שלי')
    expect(await db.deleteChecklistItem('0502222222', created.id)).toBe(false)
    expect(await db.listChecklistItems('0501111111', null)).toHaveLength(1)
  })

  it('deleteChecklistItem מחזיר true ומוחק בפועל את הבעלים האמיתי', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await db.createChecklistItem('0501111111', null, 'שלי')
    expect(await db.deleteChecklistItem('0501111111', created.id)).toBe(true)
    expect(await db.listChecklistItems('0501111111', null)).toHaveLength(0)
  })

  it('reorderChecklistItems מסדר מחדש לפי הסדר הנתון', async () => {
    const db = createLocalDb('__nonexistent__')
    const a = await db.createChecklistItem('0501111111', null, 'א')
    const b = await db.createChecklistItem('0501111111', null, 'ב')
    const ok = await db.reorderChecklistItems('0501111111', null, [b.id, a.id])
    expect(ok).toBe(true)
    const items = await db.listChecklistItems('0501111111', null)
    expect(items.map((i) => i.id)).toEqual([b.id, a.id])
  })

  it('reorderChecklistItems דוחה רשימה עם מזהה שלא שייך לסקופ', async () => {
    const db = createLocalDb('__nonexistent__')
    const a = await db.createChecklistItem('0501111111', null, 'א')
    const ok = await db.reorderChecklistItems('0501111111', null, [a.id, 9999])
    expect(ok).toBe(false)
  })
})

describe('drafts (local db)', () => {
  it('יוצר, מעדכן, ומוחק טיוטה בבידוד לפי phone', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await db.createDraft('0501111111', null, 'טיוטה ראשונה')
    expect(created.text).toBe('טיוטה ראשונה')

    const updated = await db.updateDraft('0501111111', created.id, 'טיוטה מעודכנת')
    expect(updated?.text).toBe('טיוטה מעודכנת')

    expect(await db.updateDraft('0502222222', created.id, 'לא אמור')).toBeUndefined()
    expect(await db.deleteDraft('0502222222', created.id)).toBe(false)
    expect(await db.deleteDraft('0501111111', created.id)).toBe(true)
    expect(await db.listDrafts('0501111111', null)).toHaveLength(0)
  })

  it('taskId=null מבודד טיוטות עצמאיות מטיוטות משויכות', async () => {
    const db = createLocalDb('__nonexistent__')
    await db.createDraft('0501111111', 42, 'משויכת')
    await db.createDraft('0501111111', null, 'עצמאית')
    expect(await db.listDrafts('0501111111', null)).toHaveLength(1)
    expect(await db.listDrafts('0501111111', 42)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `priority-lite/server`): `npx vitest run test/local-items.test.ts`
Expected: FAIL — `db.createChecklistItem is not a function` (method doesn't exist yet).

- [ ] **Step 3: Implement in `local-impl.ts`**

In `priority-lite/server/src/db/local-impl.ts`, add near the top (after the existing
imports) the two in-memory stores, inside `createLocalDb` alongside the existing
`employees`/`otps` maps:

```ts
  const checklistItems = new Map<number, ChecklistItemRow>()
  const drafts = new Map<number, DraftRow>()
  let checklistCounter = 0
  let draftCounter = 0
```

Update the import line to also pull in the new row types:

```ts
import type { AppDB, ChecklistItemRow, DraftRow, EmployeeRow, OtpRow } from './interface'
```

Add these methods to the returned object (after `deleteOtp`):

```ts
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
      if (orderedIds.length !== scoped.length || !orderedIds.every((id) => scopedIds.has(id))) return false
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/local-items.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc -p server --noEmit`
Expected: still fails on `supabase-impl.ts` only (fixed in Task 4).

- [ ] **Step 6: Commit**

```bash
git add server/src/db/local-impl.ts server/test/local-items.test.ts
git commit -m "feat(priority-lite): implement checklist/draft methods in local-impl + tests"
```

---

### Task 4: `supabase-impl.ts` implementation

**Files:**
- Modify: `priority-lite/server/src/priority/../db/supabase-impl.ts` (i.e.
  `priority-lite/server/src/db/supabase-impl.ts`)

No dedicated test file — matches the existing convention in this codebase, where
`supabase-impl.ts` has no direct unit tests (it's a thin pass-through to the Supabase
client; `local-impl.ts` is what gets exercised in tests, per `test/employees.test.ts`).

- [ ] **Step 1: Update the import line**

```ts
import type { AppDB, ChecklistItemRow, DraftRow, EmployeeRow, OtpRow } from './interface'
```

- [ ] **Step 2: Implement the methods**

Add to the returned object (after `deleteOtp`):

```ts
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
      if (orderedIds.length !== scopedIds.size || !orderedIds.every((id) => scopedIds.has(id))) return false
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
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p server --noEmit`
Expected: PASS.

- [ ] **Step 4: Run full server test suite**

Run: `npx vitest run`
Expected: all pass (no regressions).

- [ ] **Step 5: Commit**

```bash
git add server/src/db/supabase-impl.ts
git commit -m "feat(priority-lite): implement checklist/draft methods in supabase-impl"
```

---

### Task 5: Actions layer + tests

**Files:**
- Modify: `priority-lite/server/src/actions/index.ts`
- Create: `priority-lite/server/test/local-items-actions.test.ts`

The action layer is what converts DB row shape (snake_case: `task_id`, `sort_order`) to
the shared camelCase types (`ChecklistItem`, `DraftNote`) — this mapping did not exist
in Tasks 3–4, and is the main risk area for this task (a route returning raw DB rows
instead of the mapped shared type would break the client, which expects `taskId` not
`task_id`).

- [ ] **Step 1: Write the failing tests**

Create `priority-lite/server/test/local-items-actions.test.ts`:

```ts
// בדיקות לשכבת ה-actions של צ'קליסט/טיוטות מקומיים (Phase 2) — מיפוי ל-camelCase + בידוד לפי משתמש.
import { describe, expect, it } from 'vitest'
import type { Me } from '@priority-lite/shared'
import {
  createChecklistItem,
  createChecklistItemSchema,
  createDraft,
  createDraftSchema,
  deleteChecklistItem,
  listChecklistItems,
  listChecklistItemsSchema,
  reorderChecklistItems,
  reorderChecklistSchema,
  updateChecklistItem,
  updateChecklistItemSchema,
} from '../src/actions'
import { createLocalDb } from '../src/db/local-impl'

const me: Me = { phone: '0501234567', name: 'אלעד', priorityEmpId: '42' }
const other: Me = { phone: '0509999999', name: 'רועי', priorityEmpId: '99' }

describe('checklist actions', () => {
  it('יוצר פריט וממפה ל-camelCase (ChecklistItem)', async () => {
    const db = createLocalDb('__nonexistent__')
    const input = createChecklistItemSchema.parse({ text: 'משימה' })
    const created = await createChecklistItem(db, me, input)
    expect(created.text).toBe('משימה')
    expect(created.done).toBe(false)
    expect(created.taskId).toBeUndefined()
    expect(created.sortOrder).toBe(0)
  })

  it('רשימה מסוננת לפי taskId', async () => {
    const db = createLocalDb('__nonexistent__')
    await createChecklistItem(db, me, createChecklistItemSchema.parse({ taskId: 5001, text: 'עם משימה' }))
    await createChecklistItem(db, me, createChecklistItemSchema.parse({ text: 'עצמאי' }))
    const scoped = await listChecklistItems(db, me, listChecklistItemsSchema.parse({ taskId: 5001 }))
    expect(scoped).toHaveLength(1)
    expect(scoped[0].taskId).toBe(5001)
  })

  it('משתמש אחר לא יכול לעדכן פריט של מישהו אחר', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await createChecklistItem(db, me, createChecklistItemSchema.parse({ text: 'שלי' }))
    const result = await updateChecklistItem(db, other, created.id, updateChecklistItemSchema.parse({ done: true }))
    expect(result).toBeUndefined()
  })

  it('משתמש אחר לא יכול למחוק פריט של מישהו אחר', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await createChecklistItem(db, me, createChecklistItemSchema.parse({ text: 'שלי' }))
    expect(await deleteChecklistItem(db, other, created.id)).toBe(false)
  })

  it('reorder דוחה סדר עם מזהה שלא שייך למשתמש', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await createChecklistItem(db, me, createChecklistItemSchema.parse({ text: 'שלי' }))
    const ok = await reorderChecklistItems(db, other, reorderChecklistSchema.parse({ orderedIds: [created.id] }))
    expect(ok).toBe(false)
  })

  it('טקסט ריק נדחה בסכימה', () => {
    expect(() => createChecklistItemSchema.parse({ text: '' })).toThrow()
  })
})

describe('draft actions', () => {
  it('יוצר טיוטה וממפה ל-camelCase (DraftNote)', async () => {
    const db = createLocalDb('__nonexistent__')
    const created = await createDraft(db, me, createDraftSchema.parse({ text: 'טיוטה' }))
    expect(created.text).toBe('טיוטה')
    expect(created.taskId).toBeUndefined()
  })

  it('טקסט ריק נדחה בסכימה', () => {
    expect(() => createDraftSchema.parse({ text: '' })).toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `priority-lite/server`): `npx vitest run test/local-items-actions.test.ts`
Expected: FAIL — `createChecklistItem is not exported from '../src/actions'` (doesn't
exist yet).

- [ ] **Step 3: Implement the actions**

In `priority-lite/server/src/actions/index.ts`:

Update the top imports to add:

```ts
import type { ChecklistItem, DraftNote, Me, SyncItemResult } from '@priority-lite/shared'
```
(extend the existing `import type { Me, SyncItemResult } from '@priority-lite/shared'`
line rather than duplicating it)

and:

```ts
import type { AppDB, ChecklistItemRow, DraftRow } from '../db/db'
```
(extend the existing `import type { AppDB } from '../db/db'` line)

Add at the end of the file:

```ts
function rowToChecklistItem(row: ChecklistItemRow): ChecklistItem {
  return {
    id: row.id,
    taskId: row.task_id ?? undefined,
    text: row.text,
    done: row.done,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToDraft(row: DraftRow): DraftNote {
  return {
    id: row.id,
    taskId: row.task_id ?? undefined,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const listChecklistItemsSchema = z.object({
  taskId: z.coerce.number().int().positive().optional(),
})

export async function listChecklistItems(
  db: AppDB,
  me: Me,
  input: z.infer<typeof listChecklistItemsSchema>,
): Promise<ChecklistItem[]> {
  const rows = await db.listChecklistItems(me.phone, input.taskId ?? null)
  return rows.map(rowToChecklistItem)
}

export const createChecklistItemSchema = z.object({
  taskId: z.number().int().positive().optional(),
  text: z.string().min(1).max(500),
})

export async function createChecklistItem(
  db: AppDB,
  me: Me,
  input: z.infer<typeof createChecklistItemSchema>,
): Promise<ChecklistItem> {
  const row = await db.createChecklistItem(me.phone, input.taskId ?? null, input.text)
  return rowToChecklistItem(row)
}

export const updateChecklistItemSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  done: z.boolean().optional(),
})

export async function updateChecklistItem(
  db: AppDB,
  me: Me,
  id: number,
  input: z.infer<typeof updateChecklistItemSchema>,
): Promise<ChecklistItem | undefined> {
  const row = await db.updateChecklistItem(me.phone, id, input)
  return row ? rowToChecklistItem(row) : undefined
}

export async function deleteChecklistItem(db: AppDB, me: Me, id: number): Promise<boolean> {
  return db.deleteChecklistItem(me.phone, id)
}

export const reorderChecklistSchema = z.object({
  taskId: z.number().int().positive().optional(),
  orderedIds: z.array(z.number().int().positive()).min(1),
})

export async function reorderChecklistItems(
  db: AppDB,
  me: Me,
  input: z.infer<typeof reorderChecklistSchema>,
): Promise<boolean> {
  return db.reorderChecklistItems(me.phone, input.taskId ?? null, input.orderedIds)
}

export const listDraftsSchema = z.object({
  taskId: z.coerce.number().int().positive().optional(),
})

export async function listDrafts(db: AppDB, me: Me, input: z.infer<typeof listDraftsSchema>): Promise<DraftNote[]> {
  const rows = await db.listDrafts(me.phone, input.taskId ?? null)
  return rows.map(rowToDraft)
}

export const createDraftSchema = z.object({
  taskId: z.number().int().positive().optional(),
  text: z.string().min(1).max(5000),
})

export async function createDraft(db: AppDB, me: Me, input: z.infer<typeof createDraftSchema>): Promise<DraftNote> {
  const row = await db.createDraft(me.phone, input.taskId ?? null, input.text)
  return rowToDraft(row)
}

export const updateDraftSchema = z.object({
  text: z.string().min(1).max(5000),
})

export async function updateDraft(
  db: AppDB,
  me: Me,
  id: number,
  input: z.infer<typeof updateDraftSchema>,
): Promise<DraftNote | undefined> {
  const row = await db.updateDraft(me.phone, id, input.text)
  return row ? rowToDraft(row) : undefined
}

export async function deleteDraft(db: AppDB, me: Me, id: number): Promise<boolean> {
  return db.deleteDraft(me.phone, id)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/local-items-actions.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Typecheck + full test suite**

Run: `npx tsc -p server --noEmit`
Expected: PASS.
Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/actions/index.ts server/test/local-items-actions.test.ts
git commit -m "feat(priority-lite): add checklist/draft actions layer + tests"
```

---

### Task 6: Routes + `app.ts` wiring + route-level tests

**Files:**
- Create: `priority-lite/server/src/routes/checklist.ts`
- Create: `priority-lite/server/src/routes/drafts.ts`
- Modify: `priority-lite/server/src/app.ts`
- Create: `priority-lite/server/test/local-items-routes.test.ts`

**Route-ordering note:** `/reorder` must be registered as a static route **before**
the `/:id` param route in `checklist.ts`. If registered after, some routers would
attempt to parse `"reorder"` as the `:id` param first. Hono's router in practice
prefers static matches, but registering `/reorder` first removes any ambiguity and
documents the intent — do this even though it may not be strictly required.

- [ ] **Step 1: Write the failing tests**

Create `priority-lite/server/test/local-items-routes.test.ts`:

```ts
// בדיקות מסלולי /api/checklist ו-/api/drafts — ולידציית מזהה, בידוד לפי משתמש, 404.
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { createSessionToken, SESSION_COOKIE } from '../src/auth/session'
import type { AppContext } from '../src/context'
import { createLocalDb } from '../src/db/local-impl'
import { createChecklistRoutes } from '../src/routes/checklist'
import { createDraftRoutes } from '../src/routes/drafts'

const ME = { phone: '0501111111', name: 'אלעד', priorityEmpId: '42' }
const OTHER = { phone: '0502222222', name: 'רועי', priorityEmpId: '99' }

function buildApp() {
  const db = createLocalDb('__nonexistent__')
  const ctx = { db, adapter: {}, email: {}, env: { SESSION_SECRET: 'test-secret' } } as unknown as AppContext
  const app = new Hono()
  app.route('/api/checklist', createChecklistRoutes(ctx))
  app.route('/api/drafts', createDraftRoutes(ctx))
  return app
}

async function authHeaders(me: typeof ME) {
  const token = await createSessionToken(me, 'test-secret')
  return { cookie: `${SESSION_COOKIE}=${token}` }
}

describe('checklist routes', () => {
  it('POST יוצר ו-GET מחזיר', async () => {
    const app = buildApp()
    const createRes = await app.request('/api/checklist', {
      method: 'POST',
      headers: { ...(await authHeaders(ME)), 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'סעיף' }),
    })
    expect(createRes.status).toBe(201)

    const listRes = await app.request('/api/checklist', { headers: await authHeaders(ME) })
    expect(listRes.status).toBe(200)
    expect(await listRes.json()).toHaveLength(1)
  })

  it('משתמש אחר לא רואה את הפריט ברשימה', async () => {
    const app = buildApp()
    await app.request('/api/checklist', {
      method: 'POST',
      headers: { ...(await authHeaders(ME)), 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'סעיף' }),
    })
    const res = await app.request('/api/checklist', { headers: await authHeaders(OTHER) })
    expect(await res.json()).toHaveLength(0)
  })

  it('PATCH על פריט של משתמש אחר — 404', async () => {
    const app = buildApp()
    const createRes = await app.request('/api/checklist', {
      method: 'POST',
      headers: { ...(await authHeaders(ME)), 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'סעיף' }),
    })
    const created = (await createRes.json()) as { id: number }
    const res = await app.request(`/api/checklist/${created.id}`, {
      method: 'PATCH',
      headers: { ...(await authHeaders(OTHER)), 'content-type': 'application/json' },
      body: JSON.stringify({ done: true }),
    })
    expect(res.status).toBe(404)
  })

  it('מזהה לא מספרי — 400', async () => {
    const app = buildApp()
    const res = await app.request('/api/checklist/abc', {
      method: 'PATCH',
      headers: { ...(await authHeaders(ME)), 'content-type': 'application/json' },
      body: JSON.stringify({ done: true }),
    })
    expect(res.status).toBe(400)
  })

  it('PATCH /reorder לא מתנגש עם :id', async () => {
    const app = buildApp()
    const headers = { ...(await authHeaders(ME)), 'content-type': 'application/json' }
    const aRes = await app.request('/api/checklist', { method: 'POST', headers, body: JSON.stringify({ text: 'א' }) })
    const a = (await aRes.json()) as { id: number }
    const bRes = await app.request('/api/checklist', { method: 'POST', headers, body: JSON.stringify({ text: 'ב' }) })
    const b = (await bRes.json()) as { id: number }
    const res = await app.request('/api/checklist/reorder', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ orderedIds: [b.id, a.id] }),
    })
    expect(res.status).toBe(200)
  })
})

describe('draft routes', () => {
  it('POST יוצר ו-GET מחזיר', async () => {
    const app = buildApp()
    const headers = { ...(await authHeaders(ME)), 'content-type': 'application/json' }
    const createRes = await app.request('/api/drafts', { method: 'POST', headers, body: JSON.stringify({ text: 'טיוטה' }) })
    expect(createRes.status).toBe(201)
    const listRes = await app.request('/api/drafts', { headers: await authHeaders(ME) })
    expect(await listRes.json()).toHaveLength(1)
  })

  it('DELETE על טיוטה של משתמש אחר — 404, לא נמחקת בפועל', async () => {
    const app = buildApp()
    const createRes = await app.request('/api/drafts', {
      method: 'POST',
      headers: { ...(await authHeaders(ME)), 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'טיוטה' }),
    })
    const created = (await createRes.json()) as { id: number }
    const delRes = await app.request(`/api/drafts/${created.id}`, { method: 'DELETE', headers: await authHeaders(OTHER) })
    expect(delRes.status).toBe(404)
    const listRes = await app.request('/api/drafts', { headers: await authHeaders(ME) })
    expect(await listRes.json()).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/local-items-routes.test.ts`
Expected: FAIL — cannot find module `'../src/routes/checklist'`.

- [ ] **Step 3: Create the route files**

Create `priority-lite/server/src/routes/checklist.ts`:

```ts
// מסלולי צ'קליסט אישי מקומי (Phase 2) — לא מסונכרן עם פריוריטי, פרטי למשתמש בלבד.
import { Hono } from 'hono'
import { type AuthVars, authRequired } from '../auth/middleware'
import type { AppContext } from '../context'
import {
  createChecklistItem,
  createChecklistItemSchema,
  deleteChecklistItem,
  listChecklistItems,
  listChecklistItemsSchema,
  reorderChecklistItems,
  reorderChecklistSchema,
  updateChecklistItem,
  updateChecklistItemSchema,
} from '../actions'

export function createChecklistRoutes(ctx: AppContext) {
  const app = new Hono<AuthVars>()
  app.use('*', authRequired(ctx.env.SESSION_SECRET))

  app.get('/', async (c) => {
    const parsed = listChecklistItemsSchema.safeParse({ taskId: c.req.query('taskId') })
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    return c.json(await listChecklistItems(ctx.db, c.get('me'), parsed.data))
  })

  app.post('/', async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = createChecklistItemSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    return c.json(await createChecklistItem(ctx.db, c.get('me'), parsed.data), 201)
  })

  // רשום לפני /:id בכוונה — כדי ש-"reorder" לא ינותח בטעות כמזהה
  app.patch('/reorder', async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = reorderChecklistSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    const ok = await reorderChecklistItems(ctx.db, c.get('me'), parsed.data)
    if (!ok) return c.json({ error: 'סדר לא תקין — אחד הפריטים לא שייך לרשימה הזו' }, 400)
    return c.json({ ok: true })
  })

  app.patch('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id)) return c.json({ error: 'מזהה לא תקין' }, 400)
    const body = await c.req.json().catch(() => null)
    const parsed = updateChecklistItemSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    const updated = await updateChecklistItem(ctx.db, c.get('me'), id, parsed.data)
    if (!updated) return c.json({ error: 'פריט לא נמצא' }, 404)
    return c.json(updated)
  })

  app.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id)) return c.json({ error: 'מזהה לא תקין' }, 400)
    const ok = await deleteChecklistItem(ctx.db, c.get('me'), id)
    if (!ok) return c.json({ error: 'פריט לא נמצא' }, 404)
    return c.json({ ok: true })
  })

  return app
}
```

Create `priority-lite/server/src/routes/drafts.ts`:

```ts
// מסלולי טיוטות חופשיות מקומיות (Phase 2) — לא מסונכרן עם פריוריטי, פרטי למשתמש בלבד.
import { Hono } from 'hono'
import { type AuthVars, authRequired } from '../auth/middleware'
import type { AppContext } from '../context'
import {
  createDraft,
  createDraftSchema,
  deleteDraft,
  listDrafts,
  listDraftsSchema,
  updateDraft,
  updateDraftSchema,
} from '../actions'

export function createDraftRoutes(ctx: AppContext) {
  const app = new Hono<AuthVars>()
  app.use('*', authRequired(ctx.env.SESSION_SECRET))

  app.get('/', async (c) => {
    const parsed = listDraftsSchema.safeParse({ taskId: c.req.query('taskId') })
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    return c.json(await listDrafts(ctx.db, c.get('me'), parsed.data))
  })

  app.post('/', async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = createDraftSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    return c.json(await createDraft(ctx.db, c.get('me'), parsed.data), 201)
  })

  app.patch('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id)) return c.json({ error: 'מזהה לא תקין' }, 400)
    const body = await c.req.json().catch(() => null)
    const parsed = updateDraftSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    const updated = await updateDraft(ctx.db, c.get('me'), id, parsed.data)
    if (!updated) return c.json({ error: 'טיוטה לא נמצאה' }, 404)
    return c.json(updated)
  })

  app.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id)) return c.json({ error: 'מזהה לא תקין' }, 400)
    const ok = await deleteDraft(ctx.db, c.get('me'), id)
    if (!ok) return c.json({ error: 'טיוטה לא נמצאה' }, 404)
    return c.json({ ok: true })
  })

  return app
}
```

- [ ] **Step 4: Wire the routes into `app.ts`**

In `priority-lite/server/src/app.ts`, add imports:

```ts
import { createChecklistRoutes } from './routes/checklist'
import { createDraftRoutes } from './routes/drafts'
```

Add after the existing `app.route('/api/employees', ...)` line:

```ts
  app.route('/api/checklist', createChecklistRoutes(ctx))
  app.route('/api/drafts', createDraftRoutes(ctx))
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run test/local-items-routes.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Typecheck + full test suite**

Run: `npx tsc -p server --noEmit`
Expected: PASS.
Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/checklist.ts server/src/routes/drafts.ts server/src/app.ts server/test/local-items-routes.test.ts
git commit -m "feat(priority-lite): add /api/checklist and /api/drafts routes + tests"
```

---

### Task 7: Client shared-type re-exports

**Files:**
- Modify: `priority-lite/client/src/types.ts`

- [ ] **Step 1: Add the re-exports**

Add `ChecklistItem`, `CreateChecklistItemInput`, `UpdateChecklistItemInput`,
`DraftNote`, `CreateDraftInput` to the existing `export type { ... } from
'@priority-lite/shared'` block (alphabetically, matching the existing style):

```ts
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
```

- [ ] **Step 2: Typecheck**

Run (from `priority-lite/`): `npx tsc -p client --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/src/types.ts
git commit -m "feat(priority-lite): re-export checklist/draft types on client"
```

---

### Task 8: Client data layer (`useLocalItems.ts`) + tests

**Files:**
- Create: `priority-lite/client/src/state/useLocalItems.ts`
- Create: `priority-lite/client/src/state/useLocalItems.test.ts`

- [ ] **Step 1: Write the failing test**

Create `priority-lite/client/src/state/useLocalItems.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { taskQuery } from './useLocalItems'

describe('taskQuery', () => {
  it('בלי taskId — מחרוזת ריקה', () => {
    expect(taskQuery(undefined)).toBe('')
  })

  it('עם taskId — פרמטר בנתיב', () => {
    expect(taskQuery(42)).toBe('?taskId=42')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `priority-lite/client`): `npx vitest run src/state/useLocalItems.test.ts`
Expected: FAIL — cannot find module `'./useLocalItems'`.

- [ ] **Step 3: Implement the hook**

Create `priority-lite/client/src/state/useLocalItems.ts`:

```ts
// קריאות ישירות לשרת לצ'קליסט/טיוטות מקומיים (Phase 2) — לא מסונכרן עם פריוריטי, בלי Dexie.
import { api } from '../lib/api'
import type {
  ChecklistItem,
  CreateChecklistItemInput,
  CreateDraftInput,
  DraftNote,
  UpdateChecklistItemInput,
} from '../types'

export function taskQuery(taskId?: number): string {
  return taskId != null ? `?taskId=${taskId}` : ''
}

export async function listChecklistItems(taskId?: number): Promise<ChecklistItem[]> {
  return api<ChecklistItem[]>(`/api/checklist${taskQuery(taskId)}`)
}

export async function createChecklistItem(input: CreateChecklistItemInput): Promise<ChecklistItem> {
  return api<ChecklistItem>('/api/checklist', { method: 'POST', json: input })
}

export async function updateChecklistItem(id: number, changes: UpdateChecklistItemInput): Promise<ChecklistItem> {
  return api<ChecklistItem>(`/api/checklist/${id}`, { method: 'PATCH', json: changes })
}

export async function deleteChecklistItem(id: number): Promise<void> {
  await api<{ ok: true }>(`/api/checklist/${id}`, { method: 'DELETE' })
}

export async function reorderChecklistItems(taskId: number | undefined, orderedIds: number[]): Promise<void> {
  await api<{ ok: true }>('/api/checklist/reorder', { method: 'PATCH', json: { taskId, orderedIds } })
}

export async function listDrafts(taskId?: number): Promise<DraftNote[]> {
  return api<DraftNote[]>(`/api/drafts${taskQuery(taskId)}`)
}

export async function createDraft(input: CreateDraftInput): Promise<DraftNote> {
  return api<DraftNote>('/api/drafts', { method: 'POST', json: input })
}

export async function updateDraft(id: number, text: string): Promise<DraftNote> {
  return api<DraftNote>(`/api/drafts/${id}`, { method: 'PATCH', json: { text } })
}

export async function deleteDraft(id: number): Promise<void> {
  await api<{ ok: true }>(`/api/drafts/${id}`, { method: 'DELETE' })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/useLocalItems.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck + full client test suite**

Run (from `priority-lite/`): `npx tsc -p client --noEmit`
Expected: PASS.
Run (from `priority-lite/client`): `npx vitest run`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add client/src/state/useLocalItems.ts client/src/state/useLocalItems.test.ts
git commit -m "feat(priority-lite): add client data layer for checklist/drafts (useLocalItems)"
```

---

### Task 9: Add `@dnd-kit` dependency

**Files:**
- Modify: `priority-lite/client/package.json` (and `priority-lite/package-lock.json`,
  via the install command — do not hand-edit the lockfile)

- [ ] **Step 1: Install the packages**

Run (from `priority-lite/`):

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities -w client
```

This adds the three packages to `client/package.json` `dependencies` and updates the
root lockfile automatically — do not hand-write version numbers into `package.json`.

- [ ] **Step 2: Verify the install**

Run: `npm ls @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities -w client`
Expected: all three listed with resolved version numbers, no `UNMET DEPENDENCY`
warnings.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p client --noEmit`
Expected: PASS (nothing imports these packages yet).

- [ ] **Step 4: Commit**

```bash
git add client/package.json package-lock.json
git commit -m "chore(priority-lite): add @dnd-kit for checklist drag-reorder"
```

---

### Task 10: `ChecklistSection` and `DraftsSection` components

**Files:**
- Create: `priority-lite/client/src/components/ChecklistSection.tsx`
- Create: `priority-lite/client/src/components/DraftsSection.tsx`

No dedicated component tests for this task — matches the existing convention in this
codebase, where interactive screen/section components (`Tasks.tsx`, `TaskDetail.tsx`,
`NewCustNoteModal.tsx`) rely on the data-layer tests (Task 8) plus manual browser
verification (Task 13), not component-level unit tests. Drag-and-drop interactions in
particular are not meaningfully unit-testable without a full browser environment.

- [ ] **Step 1: Create `ChecklistSection.tsx`**

```tsx
// priority-lite/client/src/components/ChecklistSection.tsx
// צ'קליסט אישי מקומי (Phase 2) — לא מסונכרן עם פריוריטי. תומך בגרירה חופשית לסידור מחדש.
import { useEffect, useState } from 'react'
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  createChecklistItem,
  deleteChecklistItem,
  listChecklistItems,
  reorderChecklistItems,
  updateChecklistItem,
} from '../state/useLocalItems'
import type { ChecklistItem } from '../types'

interface Props {
  taskId?: number
}

function SortableRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ChecklistItem
  onToggle: (item: ChecklistItem) => void
  onDelete: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-xl bg-slate-800/40 px-3 py-2">
      <button {...attributes} {...listeners} className="cursor-grab touch-none px-1 text-slate-500" aria-label="גרור לסידור מחדש">
        ⠿
      </button>
      <input
        type="checkbox"
        checked={item.done}
        onChange={() => onToggle(item)}
        className="h-4 w-4 accent-emerald-500"
      />
      <span className={`flex-1 text-sm ${item.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
        {item.text}
      </span>
      <button onClick={() => onDelete(item.id)} className="text-slate-500" aria-label="מחק">
        ✕
      </button>
    </div>
  )
}

export function ChecklistSection({ taskId }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [newText, setNewText] = useState('')
  const [error, setError] = useState('')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    listChecklistItems(taskId)
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'שגיאה בטעינה'))
  }, [taskId])

  const addItem = async () => {
    if (!newText.trim()) return
    try {
      const created = await createChecklistItem({ taskId, text: newText.trim() })
      setItems((prev) => [...prev, created])
      setNewText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהוספה')
    }
  }

  const toggle = async (item: ChecklistItem) => {
    const prev = items
    setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
    try {
      await updateChecklistItem(item.id, { done: !item.done })
    } catch (err) {
      setItems(prev)
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון')
    }
  }

  const remove = async (id: number) => {
    const prev = items
    setItems((cur) => cur.filter((i) => i.id !== id))
    try {
      await deleteChecklistItem(id)
    } catch (err) {
      setItems(prev)
      setError(err instanceof Error ? err.message : 'שגיאה במחיקה')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(items, oldIndex, newIndex)
    const prev = items
    setItems(reordered)
    try {
      await reorderChecklistItems(taskId, reordered.map((i) => i.id))
    } catch (err) {
      setItems(prev)
      setError(err instanceof Error ? err.message : 'שגיאה בסידור מחדש')
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">צ'קליסט אישי</p>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {items.map((item) => (
              <SortableRow key={item.id} item={item} onToggle={toggle} onDelete={remove} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex gap-2">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="סעיף חדש…"
          className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
        <button
          onClick={addItem}
          disabled={!newText.trim()}
          className="rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          הוסף
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `DraftsSection.tsx`**

```tsx
// priority-lite/client/src/components/DraftsSection.tsx
// טיוטות חופשיות אישיות מקומיות (Phase 2) — לא מסונכרנות עם פריוריטי.
import { useEffect, useState } from 'react'
import { createDraft, deleteDraft, listDrafts, updateDraft } from '../state/useLocalItems'
import type { DraftNote } from '../types'

interface Props {
  taskId?: number
}

export function DraftsSection({ taskId }: Props) {
  const [drafts, setDrafts] = useState<DraftNote[]>([])
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    listDrafts(taskId)
      .then(setDrafts)
      .catch((err) => setError(err instanceof Error ? err.message : 'שגיאה בטעינה'))
  }, [taskId])

  const add = async () => {
    if (!newText.trim()) return
    try {
      const created = await createDraft({ taskId, text: newText.trim() })
      setDrafts((prev) => [...prev, created])
      setNewText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהוספה')
    }
  }

  const startEdit = (d: DraftNote) => {
    setEditingId(d.id)
    setEditText(d.text)
  }

  const saveEdit = async () => {
    if (editingId == null || !editText.trim()) return
    try {
      const updated = await updateDraft(editingId, editText.trim())
      setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון')
    }
  }

  const remove = async (id: number) => {
    const prev = drafts
    setDrafts((cur) => cur.filter((d) => d.id !== id))
    try {
      await deleteDraft(id)
    } catch (err) {
      setDrafts(prev)
      setError(err instanceof Error ? err.message : 'שגיאה במחיקה')
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">טיוטות</p>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div className="space-y-1.5">
        {drafts.map((d) => (
          <div key={d.id} className="rounded-xl bg-slate-800/40 p-2.5">
            {editingId === d.id ? (
              <div className="space-y-1.5">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white">
                    שמור
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-slate-400">
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-wrap text-sm text-slate-200">{d.text}</p>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => startEdit(d)} className="text-xs text-slate-500" aria-label="ערוך">
                    ✎
                  </button>
                  <button onClick={() => remove(d.id)} className="text-xs text-slate-500" aria-label="מחק">
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="טיוטה חדשה…"
          className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
        <button
          onClick={add}
          disabled={!newText.trim()}
          className="rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          הוסף
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run (from `priority-lite/`): `npx tsc -p client --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ChecklistSection.tsx client/src/components/DraftsSection.tsx
git commit -m "feat(priority-lite): add ChecklistSection and DraftsSection components"
```

---

### Task 11: "שלי" tab — `MyItems.tsx` screen + navigation wiring

**Files:**
- Create: `priority-lite/client/src/screens/MyItems.tsx`
- Modify: `priority-lite/client/src/components/BottomNav.tsx`
- Modify: `priority-lite/client/src/App.tsx`

- [ ] **Step 1: Create the screen**

```tsx
// priority-lite/client/src/screens/MyItems.tsx
// טאב "שלי" — צ'קליסטים וטיוטות עצמאיים (לא משויכים למשימת פריוריטי).
import { ChecklistSection } from '../components/ChecklistSection'
import { DraftsSection } from '../components/DraftsSection'

export function MyItems() {
  return (
    <div className="space-y-6 pb-6">
      <ChecklistSection />
      <DraftsSection />
    </div>
  )
}
```

- [ ] **Step 2: Add the tab to `BottomNav.tsx`**

Change the `Tab` type:

```ts
export type Tab = 'today' | 'entries' | 'tasks' | 'mine' | 'summary' | 'settings'
```

Add to the `TABS` array, between `'tasks'` and `'summary'`:

```ts
  { id: 'mine', label: 'שלי', icon: '✅' },
```

- [ ] **Step 3: Wire the tab into `App.tsx`**

Add the import:

```ts
import { MyItems } from './screens/MyItems'
```

Add to `TAB_TITLES`:

```ts
  mine: 'שלי',
```

Add to the `<main>` render block, after the `tasks`/`TaskDetail` block:

```tsx
        {tab === 'mine' && <MyItems />}
```

- [ ] **Step 4: Typecheck**

Run (from `priority-lite/`): `npx tsc -p client --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/screens/MyItems.tsx client/src/components/BottomNav.tsx client/src/App.tsx
git commit -m "feat(priority-lite): add \"שלי\" tab for standalone checklist/drafts"
```

---

### Task 12: `TaskDetail.tsx` integration

**Files:**
- Modify: `priority-lite/client/src/screens/TaskDetail.tsx`

- [ ] **Step 1: Add the imports**

Add near the top of `TaskDetail.tsx`, alongside the existing imports:

```ts
import { ChecklistSection } from '../components/ChecklistSection'
import { DraftsSection } from '../components/DraftsSection'
```

- [ ] **Step 2: Render the sections**

`TaskDetail.tsx` currently ends with the status-history block, then the
`<AssigneePicker ... />` element, then the closing `</div>` of the outer
`<div className="space-y-4 pb-6">`. Add the two new sections immediately **after**
`<AssigneePicker ... />` and before that final closing `</div>`:

```tsx
      <AssigneePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(e: EmployeeSummary) => applyChange({ handlerEmpId: e.priorityEmpId })}
      />

      <ChecklistSection taskId={note.id} />
      <DraftsSection taskId={note.id} />
    </div>
  )
}
```

(this shows the existing `AssigneePicker` and closing tags for orientation — only the
two new lines are actually being added)

- [ ] **Step 3: Typecheck**

Run (from `priority-lite/`): `npx tsc -p client --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/screens/TaskDetail.tsx
git commit -m "feat(priority-lite): show checklist/drafts section inside TaskDetail"
```

---

### Task 13: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run (from `priority-lite/`):
```bash
npx tsc -p server --noEmit
npx tsc -p client --noEmit
```
Expected: both PASS. (Do **not** run `npx tsc -p shared --noEmit` — see the note at
the top of this plan.)

- [ ] **Step 2: Full test suites**

Run:
```bash
npm run test -w server
npm run test -w client
```
Expected: all tests pass, including every test added in Tasks 3, 5, 6, 8.

- [ ] **Step 3: Production build**

Run (from `priority-lite/`): `npm run build`
Expected: succeeds (confirms the new `@dnd-kit` dependency and all new files bundle
cleanly for Vercel).

- [ ] **Step 4: Manual browser check (mock mode)**

Start the dev servers in mock mode and verify in a browser:
1. New "שלי" tab appears in the bottom nav and opens `MyItems`.
2. Add a checklist item and a draft from the "שלי" tab; both appear.
3. Toggle the checklist item's checkbox; it shows as done (strikethrough).
4. Add at least 2 checklist items and drag to reorder them; the new order persists
   after a page reload.
5. Open a task's `TaskDetail` screen; add a checklist item and a draft there — confirm
   they do **not** appear in the "שלי" tab (task-scoped, not standalone), and vice
   versa.
6. Edit and delete a draft.

- [ ] **Step 5: Update the vault**

Update `vault/Meeting Notes/priority-lite-app.md` (Overview + a new dated Session Log
entry) to record that Phase 2 is implemented, tested, and merged — following the
`obsidian-vault-workflow` skill's format.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "docs(priority-lite): Phase 2 (local checklists & drafts) complete"
```
(Only if Step 5 produced uncommitted changes — if the vault update was already
committed as part of Step 5, skip this step.)
