# Priority Lite — Task Management Phase 2: Local Checklists & Drafts

**Status:** Approved by user (2026-08-18). Ready for implementation planning.

## Background

Phase 1 (merged to `main`, live-verified against real Priority on 2026-08-18) added full
task management synced with Priority: create/search/update CUSTNOTESA tasks, status
changes, reassignment, and status history.

The original request also included a second, deliberately separate capability:

> "אני רוצה גם אפשרות בתוך התכנה לעשות סאבטסקים או טיוטות לשימוש פנימי, שלא אמור להיות
> מסונכרן עם הפריוריטי" — the ability to create subtasks or drafts for internal use,
> that must never sync to Priority.

This spec covers that second capability only ("Phase 2").

## Scope

Two independent item types, both created by the user for their own personal use:

1. **Checklist items** — short text + a done/not-done toggle. Ordered, freely
   drag-reorderable within their list.
2. **Drafts** — free-form text notes. No done state, no ordering requirement beyond
   creation order.

Both types can be either:
- **Attached** to an existing Priority task from Phase 1 (referenced by its `CUSTNOTE`
  id), or
- **Standalone** — not attached to any task at all.

Neither type is ever sent to Priority. This is enforced structurally: nothing in this
feature ever calls `PriorityAdapter`.

**Visibility:** strictly private to the creating user. No teammate, including someone
assigned to the same Priority task, can see another user's checklist items or drafts.

**Device reach:** persisted in Supabase (not local-only IndexedDB), so a user's items
follow them across their own devices/browsers. This is the one meaningful architectural
choice in this spec — see Data Model below for why it doesn't reuse the Dexie-based
local-draft pattern already used for time entries.

## Data Model

Two new Supabase tables, following the existing schema convention in
`supabase-schema.sql` (`phone` as the user identifier, RLS disabled — this is a
server-side-only app using the service key; all access control happens in the Hono
route/action layer, exactly like `employees`/`otp_codes` today):

```sql
CREATE TABLE IF NOT EXISTS local_checklist_items (
  id          BIGSERIAL PRIMARY KEY,
  phone       TEXT NOT NULL REFERENCES employees(phone),
  task_id     BIGINT,                          -- CUSTNOTE id from Priority; NULL = standalone
  text        TEXT NOT NULL,
  done        BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS local_drafts (
  id          BIGSERIAL PRIMARY KEY,
  phone       TEXT NOT NULL REFERENCES employees(phone),
  task_id     BIGINT,                          -- CUSTNOTE id from Priority; NULL = standalone
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE local_checklist_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE local_drafts DISABLE ROW LEVEL SECURITY;
```

`task_id` is a loose reference to Priority's `CUSTNOTE` id — an integer column, **not**
a foreign key to another table (there is no local tasks table; CUSTNOTESA lives in
Priority). This mirrors the existing `custnoteId` field on time entries
(`TimeEntryInput.custnoteId` in `shared/src/types.ts`). No cascade/orphan handling is
needed: if the referenced Priority task is later closed or reassigned, the local items
simply keep existing and stay reachable by `task_id` — they don't disappear or error.

Shared types (`shared/src/types.ts`):

```ts
export interface ChecklistItem {
  id: number
  taskId?: number   // CUSTNOTE id; absent = standalone
  text: string
  done: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface DraftNote {
  id: number
  taskId?: number
  text: string
  createdAt: string
  updatedAt: string
}
```

## Server Layer

`AppDB` interface (`server/src/db/interface.ts`) gains:

```ts
listChecklistItems(phone: string, taskId?: number): Promise<ChecklistItemRow[]>
createChecklistItem(phone: string, input: { taskId?: number; text: string }): Promise<ChecklistItemRow>
updateChecklistItem(phone: string, id: number, changes: { text?: string; done?: boolean }): Promise<ChecklistItemRow>
deleteChecklistItem(phone: string, id: number): Promise<void>
reorderChecklistItems(phone: string, taskId: number | null, orderedIds: number[]): Promise<void>

listDrafts(phone: string, taskId?: number): Promise<DraftRow[]>
createDraft(phone: string, input: { taskId?: number; text: string }): Promise<DraftRow>
updateDraft(phone: string, id: number, text: string): Promise<DraftRow>
deleteDraft(phone: string, id: number): Promise<void>
```

Implemented in both `local-impl.ts` (in-memory, for tests/dev) and `supabase-impl.ts`.
Every method takes `phone` explicitly and filters by it — **this is the actual access
control**, replacing what RLS would otherwise do. Every DB method must scope its
`WHERE`/filter by the given `phone`; a method that forgot this would leak one user's
items to another and must be caught in review, mirroring how `updateCustNote`'s
handler-whitelist check works today. No DB triggers are introduced — `updated_at` is set
by the application code on every write (`update`/`reorder`), same as the rest of this
schema, which has no triggers today.

Actions layer (`server/src/actions/index.ts`): zod schemas + handlers per operation,
mirroring the `searchCustNotes`/`updateCustNote` pattern — each handler receives `me`
and passes `me.phone` to the DB layer, never a client-supplied phone.

Routes (`server/src/routes/`, new files `checklist.ts` and `drafts.ts`):
- `GET /api/checklist?taskId=` — list (all standalone items if `taskId` omitted)
- `POST /api/checklist` — create
- `PATCH /api/checklist/:id` — update text/done
- `DELETE /api/checklist/:id` — delete
- `PATCH /api/checklist/reorder` — body `{ taskId: number | null, orderedIds: number[] }`.
  `orderedIds` is the **complete** list of ids in the target scope (that task, or all
  standalone items), in their new order — not a single-item move. The handler validates
  every id in `orderedIds` belongs to `me.phone` and to the given `taskId` scope before
  writing, rejecting the whole batch otherwise.
- `GET /api/drafts?taskId=`, `POST /api/drafts`, `PATCH /api/drafts/:id`,
  `DELETE /api/drafts/:id` — same shape, no reorder (drafts have no ordering).

All routes go behind the existing `authRequired` middleware, same as `/api/custnotes`.

## Client Layer

New hook `client/src/state/useLocalItems.ts` (or split into `useChecklist.ts` /
`useDrafts.ts` if either grows past a comfortable single-file size), mirroring
`useCustNotes.ts`: plain `fetch` wrappers for each route, no offline queue, no Dexie —
a network write on every change is fine here (unlike time entries, which specifically
need offline capture in the field).

**New "שלי" ("Mine") tab** in `BottomNav`/`App.tsx`, alongside `today`/`entries`/
`tasks`/`summary`/`settings`. New screen `screens/MyItems.tsx` showing the user's
standalone checklist items and drafts (`task_id IS NULL`), with add/toggle/edit/delete
and drag-reorder for checklist items.

**`TaskDetail.tsx` addition:** a new section (below the existing description/history
sections) showing checklist items and drafts filtered to the current task's id, with
the same add/toggle/edit/delete/reorder controls as the standalone view. This can share
a single presentational component with `MyItems.tsx` (e.g. `ChecklistSection` /
`DraftsSection`), parameterized by `taskId: number | null`.

**Drag-reorder:** use `@dnd-kit/core` (+ `@dnd-kit/sortable`) — a small, actively
maintained library with genuine touch support, appropriate for a mobile-first PWA where
native HTML5 drag-and-drop does not work well on touch. This is a new dependency; if it
proves awkward in practice, the fallback is manual up/down move buttons (no drag), but
`@dnd-kit` should be tried first since the user explicitly asked for free dragging.

## Error Handling

Same established pattern throughout the codebase: try/catch at the route layer,
clean user-facing error messages, no stack traces or internal details exposed. No
cascade-delete logic is needed (see Data Model above — no real FK to a tasks table).

## Testing

- Server: DB-interface tests for the new `AppDB` methods (mirroring
  `test/employees.test.ts`), action-layer tests (mirroring
  `test/custnotes-actions.test.ts`), and route-level tests (mirroring the just-added
  `test/custnotes-routes.test.ts`) — covering ownership checks (a user cannot read/edit/
  delete another user's item) as the primary security-relevant behavior.
- Client: hook tests for `useLocalItems` (mirroring `useCustNotes.test.ts`).

## Explicitly Out of Scope

- Sharing a checklist/draft with teammates.
- Reminders or due dates on checklist items or drafts.
- Any offline/Dexie-based local queue for this feature.
- Converting/"promoting" a draft or checklist item into a real Priority task.
