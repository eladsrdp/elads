# Participant Management + Mentor Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the project owner and mentors add, edit, and delete participants directly from `mentor-dashboard/` (currently read-only), and tag each participant with an "assigned mentor" (an organizational label, not an access restriction — every mentor still sees every participant, unchanged from Plan D).

**Architecture:** Extends the existing `hachamama-parenting-program/mentor-dashboard/` app (same one used for Plan D's read-only dashboard and Plan B's content editor) — same pattern: mentors get RLS write access on `participants` via a new migration, all mutations happen directly from the browser via Supabase client (no new API routes), UI follows the exact inline-edit-plus-client-component shape already used in `content-grid.tsx`.

**Decisions from clarification (2026-08-04):**
- **Mentor assignment is a label only.** `participants.assigned_mentor_id` is a plain nullable FK shown in the UI — it does **not** change who can see a participant. All existing/new RLS policies on `participants` stay "any mentor" scoped, matching Plan D's original "no assignment restricts visibility" decision.
- **Deletion is blocked when the participant has any history** (`daily_triggers`, `message_deliveries`, or `video_submissions` rows). The UI shows a message suggesting to set status to `paused` instead. Only participants with zero history rows can be hard-deleted (covers "added by mistake" cases).

**Tech Stack:** Same as Plan B — Next.js Client Components for the interactive parts, direct Supabase calls (RLS-enforced), Vitest for pure logic.

---

## File Structure

```
hachamama-parenting-program/
  server/
    migrations/
      0005_participant_management.sql   # NEW — assigned_mentor_id column, mentor write RLS on
                                         #        participants, mentors-see-all-mentors policy
  mentor-dashboard/
    src/
      lib/
        program-day.ts                  # MODIFY — add calculateDay1Date
        program-day.test.ts             # MODIFY — cover it
        mentor-data-source.ts           # MODIFY — MentorRecord type, listMentors,
                                         #          createParticipant/updateParticipant/deleteParticipant,
                                         #          getParticipantHistoryCounts, assigned_mentor_id on ParticipantRecord
        mentor-view.ts                  # MODIFY — assignedMentorId/assignedMentorName on list+detail views,
                                         #          canDeleteParticipant pure helper
        mentor-view.test.ts             # MODIFY — cover the above
      app/participants/
        page.tsx                        # MODIFY — pass mentors list to the table, thin Server Component
        participants-table.tsx          # NEW — Client Component: add form, inline edit, delete w/ block message
```

---

## Task 1: Migration — `assigned_mentor_id` column + mentor write RLS on `participants` + mentor roster visibility

**Files:**
- Create: `hachamama-parenting-program/server/migrations/0005_participant_management.sql`

- [ ] **Step 1: Write the migration**

```sql
-- hachamama-parenting-program/server/migrations/0005_participant_management.sql
-- מוסיף למנחות (טבלת mentors, ראו 0002_mentor_rls.sql) גישת read-write על participants —
-- עד עכשיו היה להן רק SELECT (Plan D). גם מוסיף עמודת assigned_mentor_id (תגית ארגונית
-- בלבד — לא משנה מי רואה מה; כל מנחה עדיין רואה את כל הנרשמים, בכוונה, ראו design doc
-- § "דשבורד מנחות"). וגם policy חדש שמאפשר למנחה לראות את *כל* שורות mentors (לא רק
-- את עצמה) — נדרש כדי להציג רשימת בחירה "הצמד מנחה" במסך.

alter table participants add column assigned_mentor_id uuid references mentors(user_id);

create policy participants_insert_mentor on participants
  for insert to authenticated
  with check (exists (select 1 from mentors where user_id = auth.uid()));

create policy participants_update_mentor on participants
  for update to authenticated
  using (exists (select 1 from mentors where user_id = auth.uid()))
  with check (exists (select 1 from mentors where user_id = auth.uid()));

create policy participants_delete_mentor on participants
  for delete to authenticated
  using (exists (select 1 from mentors where user_id = auth.uid()));

-- מנחה יכולה כבר לראות את עצמה (mentors_select_self, 0002) — זה מוסיף ראייה של *כל* השורות,
-- כדי שרשימת "הצמד מנחה" תציג את כל המנחות הקיימות, לא רק את המנחה המחוברת.
create policy mentors_select_all on mentors
  for select to authenticated
  using (exists (select 1 from mentors m where m.user_id = auth.uid()));
```

- [ ] **Step 2: Run it against the real Supabase project, then verify**

```sql
select policyname from pg_policies where tablename in ('participants', 'mentors') order by tablename, policyname;
```

Expected: `participants` has `participants_select_mentor` (0002) + the 3 new ones; `mentors` has `mentors_select_self` (0002) + `mentors_select_all` (new).

- [ ] **Step 3: Commit**

```bash
git add hachamama-parenting-program/server/migrations/0005_participant_management.sql
git commit -m "feat(hachamama): add mentor write RLS on participants + assigned_mentor_id column"
```

---

## Task 2: `calculateDay1Date` in `program-day.ts`

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/lib/program-day.ts`
- Modify: `hachamama-parenting-program/mentor-dashboard/src/lib/program-day.test.ts`

Duplicates `server/src/domain/scheduling.ts`'s `calculateDay1Date` — same YAGNI reasoning already documented at the top of this file for the other two functions (two independently-deployed apps, not worth a shared package for ~10 lines).

- [ ] **Step 1: Add a failing test to `program-day.test.ts`**

Add this new `describe` block:

```ts
describe('calculateDay1Date', () => {
  it('נרשם ביום שלישי מתחיל ביום ראשון הבא (לא באותו שבוע)', () => {
    // 2026-08-04 הוא יום שלישי (זוגי עם today's date בפרויקט)
    expect(calculateDay1Date(new Date('2026-08-04T10:00:00Z'))).toBe('2026-08-09')
  })

  it('נרשם ביום ראשון עצמו מתחיל ביום ראשון הבא, לא באותו יום', () => {
    // 2026-08-02 הוא יום ראשון
    expect(calculateDay1Date(new Date('2026-08-02T10:00:00Z'))).toBe('2026-08-09')
  })
})
```

Add `calculateDay1Date` to the existing import line at the top of the file.

- [ ] **Step 2: Run it to verify it fails**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx vitest run src/lib/program-day.test.ts
```

Expected: FAIL — `calculateDay1Date is not a function` (or similar).

- [ ] **Step 3: Add the implementation to `program-day.ts`**

Add this function (matches `server/src/domain/scheduling.ts`'s `calculateDay1Date` exactly):

```ts
/**
 * יום 1 = יום ראשון הראשון שאחרי תאריך ההרשמה (לפי הזמן המקומי בישראל),
 * לעולם לא אותו יום ראשון עצמו — נרשם ביום ראשון מתחיל בראשון של השבוע הבא.
 */
export function calculateDay1Date(signupAt: Date): string {
  const israelSignup = DateTime.fromJSDate(signupAt).setZone(ISRAEL_ZONE)
  const dayOfWeek = israelSignup.weekday % 7 // luxon: 1=שני..7=ראשון → הופך ל-0=ראשון..6=שבת
  const daysUntilNextSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek
  return israelSignup.plus({ days: daysUntilNextSunday }).toISODate() as string
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npx vitest run src/lib/program-day.test.ts
```

Expected: PASS (5 tests total — 3 existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/lib/program-day.ts hachamama-parenting-program/mentor-dashboard/src/lib/program-day.test.ts
git commit -m "feat(mentor-dashboard): add calculateDay1Date for manual participant creation"
```

---

## Task 3: Extend `mentor-data-source.ts` — mentor roster + participant CRUD

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/lib/mentor-data-source.ts`

No test in this task — thin Supabase adapter, same convention as the rest of this file.

- [ ] **Step 1: Add `assigned_mentor_id` to `ParticipantRecord` and update the two `select()` calls that fetch it**

```ts
export interface ParticipantRecord {
  id: string
  full_name: string
  phone: string
  status: string
  day1_date: string
  assigned_mentor_id: string | null
}
```

Update both `.select('id, full_name, phone, status, day1_date')` calls in `listParticipants` and `getParticipant` to `.select('id, full_name, phone, status, day1_date, assigned_mentor_id')`.

- [ ] **Step 2: Add a `MentorRecord` type and `listMentors` method**

```ts
export interface MentorRecord {
  user_id: string
  full_name: string
}
```

Add `listMentors(): Promise<MentorRecord[]>` to the `MentorDataSource` interface, and implement it:

```ts
    async listMentors() {
      const { data, error } = await supabase.from('mentors').select('user_id, full_name').order('full_name', { ascending: true })
      if (error) throw error
      return data as MentorRecord[]
    },
```

- [ ] **Step 3: Add participant CRUD methods**

Add to the `MentorDataSource` interface:

```ts
  createParticipant(input: {
    fullName: string
    phone: string
    day1Date: string
    assignedMentorId: string | null
  }): Promise<ParticipantRecord>
  updateParticipant(
    id: string,
    input: { fullName: string; phone: string; status: string; assignedMentorId: string | null },
  ): Promise<void>
  deleteParticipant(id: string): Promise<void>
  getParticipantHistoryCounts(id: string): Promise<{ triggers: number; deliveries: number; videoSubmissions: number }>
```

Implement them:

```ts
    async createParticipant(input) {
      const { data, error } = await supabase
        .from('participants')
        .insert({
          full_name: input.fullName,
          phone: input.phone,
          signup_source_ref: 'mentor-dashboard',
          signup_at: new Date().toISOString(),
          day1_date: input.day1Date,
          assigned_mentor_id: input.assignedMentorId,
        })
        .select('id, full_name, phone, status, day1_date, assigned_mentor_id')
        .single()
      if (error) throw error
      return data as ParticipantRecord
    },

    async updateParticipant(id, input) {
      const { error } = await supabase
        .from('participants')
        .update({
          full_name: input.fullName,
          phone: input.phone,
          status: input.status,
          assigned_mentor_id: input.assignedMentorId,
        })
        .eq('id', id)
      if (error) throw error
    },

    async deleteParticipant(id) {
      const { error } = await supabase.from('participants').delete().eq('id', id)
      if (error) throw error
    },

    async getParticipantHistoryCounts(id) {
      const [triggers, deliveries, videoSubmissions] = await Promise.all([
        supabase.from('daily_triggers').select('id', { count: 'exact', head: true }).eq('participant_id', id),
        supabase.from('message_deliveries').select('id', { count: 'exact', head: true }).eq('participant_id', id),
        supabase.from('video_submissions').select('id', { count: 'exact', head: true }).eq('participant_id', id),
      ])
      if (triggers.error) throw triggers.error
      if (deliveries.error) throw deliveries.error
      if (videoSubmissions.error) throw videoSubmissions.error
      return {
        triggers: triggers.count ?? 0,
        deliveries: deliveries.count ?? 0,
        videoSubmissions: videoSubmissions.count ?? 0,
      }
    },
```

- [ ] **Step 4: Typecheck**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx tsc --noEmit
```

This will surface the fake data source in `mentor-view.test.ts` (Task 4) missing the new methods — that's expected, fixed in Task 4.

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/lib/mentor-data-source.ts
git commit -m "feat(mentor-dashboard): add mentor roster and participant CRUD to MentorDataSource"
```

---

## Task 4: `mentor-view.ts` — assignment fields + delete-eligibility logic

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.ts`
- Modify: `hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `mentor-view.test.ts`:

```ts
import { canDeleteParticipant } from './mentor-view'
```

(add to the existing import line)

```ts
describe('canDeleteParticipant', () => {
  it('מאפשר מחיקה כשאין שום היסטוריה', () => {
    expect(canDeleteParticipant({ triggers: 0, deliveries: 0, videoSubmissions: 0 })).toBe(true)
  })

  it('חוסם מחיקה אם יש ולו רשומת היסטוריה אחת, מכל סוג', () => {
    expect(canDeleteParticipant({ triggers: 1, deliveries: 0, videoSubmissions: 0 })).toBe(false)
    expect(canDeleteParticipant({ triggers: 0, deliveries: 1, videoSubmissions: 0 })).toBe(false)
    expect(canDeleteParticipant({ triggers: 0, deliveries: 0, videoSubmissions: 1 })).toBe(false)
  })
})
```

Also update the `fakeDataSource` helper in this file to add defaults for the new `MentorDataSource` methods so existing tests keep compiling:

```ts
    listMentors: async () => [],
    createParticipant: async () => {
      throw new Error('not implemented in this fake')
    },
    updateParticipant: async () => {},
    deleteParticipant: async () => {},
    getParticipantHistoryCounts: async () => ({ triggers: 0, deliveries: 0, videoSubmissions: 0 }),
```

Also update the existing `buildParticipantList` test's expected objects to include `assignedMentorId: null` and `assignedMentorName: null` (since `ParticipantListItem` gains these fields in Step 2) — and the "מחשב יום-תוכנית..." test's fake `listParticipants` return values need `assigned_mentor_id: null` added to each participant object (matches the updated `ParticipantRecord` shape from Task 3).

- [ ] **Step 2: Run it to verify it fails**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx vitest run src/lib/mentor-view.test.ts
```

Expected: FAIL — `canDeleteParticipant` doesn't exist yet, plus type errors from the shape mismatches above.

- [ ] **Step 3: Implement in `mentor-view.ts`**

Add `assignedMentorId: string | null` and `assignedMentorName: string | null` to `ParticipantListItem`, and update `buildParticipantList` to compute them — it needs the mentor roster to resolve a name from an id, so change its signature to also accept the mentors list:

```ts
export async function buildParticipantList(
  dataSource: MentorDataSource,
  now: Date,
): Promise<ParticipantListItem[]> {
  const todayDate = getIsraelDateString(now)
  const [participants, triggers, mentors] = await Promise.all([
    dataSource.listParticipants(),
    dataSource.getTriggersForDate(todayDate),
    dataSource.listMentors(),
  ])
  const clickedByParticipant = new Map(triggers.map((t) => [t.participant_id, t.clicked_at !== null]))
  const mentorNameById = new Map(mentors.map((m) => [m.user_id, m.full_name]))

  return participants.map((p) => ({
    id: p.id,
    fullName: p.full_name,
    phone: p.phone,
    status: p.status,
    programDay: calculateProgramDayNumber(p.day1_date, todayDate),
    clickedToday: clickedByParticipant.get(p.id) ?? false,
    assignedMentorId: p.assigned_mentor_id,
    assignedMentorName: p.assigned_mentor_id ? (mentorNameById.get(p.assigned_mentor_id) ?? null) : null,
  }))
}
```

Add a pure helper function:

```ts
export function canDeleteParticipant(counts: { triggers: number; deliveries: number; videoSubmissions: number }): boolean {
  return counts.triggers === 0 && counts.deliveries === 0 && counts.videoSubmissions === 0
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npx vitest run src/lib/mentor-view.test.ts
```

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

This will surface `src/app/participants/page.tsx` calling `buildParticipantList(dataSource, new Date())` with only 2 args where the function itself didn't change its arity (it still takes 2 args — `dataSource` now internally also calls `listMentors()`, so no caller changes are needed here). If typecheck still shows an unrelated error in `page.tsx`, read the actual message and fix it — don't assume, verify.

- [ ] **Step 6: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.ts hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.test.ts
git commit -m "feat(mentor-dashboard): add mentor-assignment fields and delete-eligibility logic"
```

---

## Task 5: Participants page — add/edit/delete UI

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/app/participants/page.tsx`
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/participants/participants-table.tsx`

- [ ] **Step 1: Rewrite `page.tsx`** to fetch the mentor roster too and pass everything to a new client component:

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/participants/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseMentorDataSource } from '@/lib/mentor-data-source'
import { buildParticipantList } from '@/lib/mentor-view'
import { signOut } from '../login/actions'
import { ParticipantsTable } from './participants-table'
import Link from 'next/link'

export default async function ParticipantsPage() {
  const supabase = await createSupabaseServerClient()
  const dataSource = createSupabaseMentorDataSource(supabase)
  const [participants, mentors] = await Promise.all([
    buildParticipantList(dataSource, new Date()),
    dataSource.listMentors(),
  ])

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>נרשמים</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/content">תכנים</Link>
          <form action={signOut}>
            <button type="submit">התנתקות</button>
          </form>
        </div>
      </div>
      <ParticipantsTable initialParticipants={participants} mentors={mentors} />
    </main>
  )
}
```

(This replaces the previous inline `<table>` — the table itself moves into `ParticipantsTable`, which also needs a link to `/participants/[id]` per row, same as before.)

- [ ] **Step 2: Write `participants-table.tsx`**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/participants/participants-table.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { createSupabaseMentorDataSource, type MentorRecord } from '@/lib/mentor-data-source'
import { calculateDay1Date } from '@/lib/program-day'
import { canDeleteParticipant, type ParticipantListItem } from '@/lib/mentor-view'

export function ParticipantsTable({
  initialParticipants,
  mentors,
}: {
  initialParticipants: ParticipantListItem[]
  mentors: MentorRecord[]
}) {
  const [participants, setParticipants] = useState(initialParticipants)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null)
  const dataSource = createSupabaseMentorDataSource(createSupabaseBrowserClient())

  async function handleAdd() {
    if (!newName || !newPhone) return
    const day1Date = calculateDay1Date(new Date())
    const created = await dataSource.createParticipant({
      fullName: newName,
      phone: newPhone,
      day1Date,
      assignedMentorId: null,
    })
    setParticipants((prev) => [
      ...prev,
      {
        id: created.id,
        fullName: created.full_name,
        phone: created.phone,
        status: created.status,
        programDay: 1,
        clickedToday: false,
        assignedMentorId: null,
        assignedMentorName: null,
      },
    ])
    setNewName('')
    setNewPhone('')
  }

  async function handleFieldSave(
    id: string,
    fields: { fullName: string; phone: string; status: string; assignedMentorId: string | null },
  ) {
    await dataSource.updateParticipant(id, fields)
    setParticipants((prev) =>
      prev.map((p) =>
        p.id !== id
          ? p
          : {
              ...p,
              fullName: fields.fullName,
              phone: fields.phone,
              status: fields.status,
              assignedMentorId: fields.assignedMentorId,
              assignedMentorName: mentors.find((m) => m.user_id === fields.assignedMentorId)?.full_name ?? null,
            },
      ),
    )
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    const counts = await dataSource.getParticipantHistoryCounts(id)
    if (!canDeleteParticipant(counts)) {
      setBlockedMessage('לא ניתן למחוק — יש להם היסטוריית הודעות. אפשר לשנות סטטוס ל"מושהה" במקום.')
      return
    }
    if (!window.confirm('למחוק את הנרשם?')) return
    await dataSource.deleteParticipant(id)
    setParticipants((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div>
      {blockedMessage && (
        <p style={{ color: 'red' }}>
          {blockedMessage} <button onClick={() => setBlockedMessage(null)}>סגור</button>
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <input placeholder="שם מלא" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <input placeholder="טלפון" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
        <button onClick={handleAdd}>+ נרשם חדש</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'right' }}>שם</th>
            <th style={{ textAlign: 'right' }}>טלפון</th>
            <th style={{ textAlign: 'right' }}>יום בתוכנית</th>
            <th style={{ textAlign: 'right' }}>לחץ היום?</th>
            <th style={{ textAlign: 'right' }}>סטטוס</th>
            <th style={{ textAlign: 'right' }}>מנחה מוצמדת</th>
            <th style={{ textAlign: 'right' }}></th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) =>
            editingId === p.id ? (
              <EditRow key={p.id} participant={p} mentors={mentors} onSave={handleFieldSave} onCancel={() => setEditingId(null)} />
            ) : (
              <tr key={p.id} style={{ borderTop: '1px solid #ddd' }}>
                <td>
                  <Link href={`/participants/${p.id}`}>{p.fullName}</Link>
                </td>
                <td>{p.phone}</td>
                <td>{p.programDay}</td>
                <td>{p.clickedToday ? '✅' : '❌'}</td>
                <td>{p.status}</td>
                <td>{p.assignedMentorName ?? '—'}</td>
                <td>
                  <button onClick={() => setEditingId(p.id)}>✎</button>
                  <button onClick={() => handleDelete(p.id)}>🗑</button>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}

function EditRow({
  participant,
  mentors,
  onSave,
  onCancel,
}: {
  participant: ParticipantListItem
  mentors: MentorRecord[]
  onSave: (id: string, fields: { fullName: string; phone: string; status: string; assignedMentorId: string | null }) => void
  onCancel: () => void
}) {
  const [fullName, setFullName] = useState(participant.fullName)
  const [phone, setPhone] = useState(participant.phone)
  const [status, setStatus] = useState(participant.status)
  const [assignedMentorId, setAssignedMentorId] = useState(participant.assignedMentorId ?? '')

  return (
    <tr style={{ borderTop: '1px solid #ddd' }}>
      <td>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </td>
      <td>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </td>
      <td>{participant.programDay}</td>
      <td>{participant.clickedToday ? '✅' : '❌'}</td>
      <td>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">active</option>
          <option value="paused">paused</option>
          <option value="completed">completed</option>
        </select>
      </td>
      <td>
        <select value={assignedMentorId} onChange={(e) => setAssignedMentorId(e.target.value)}>
          <option value="">—</option>
          {mentors.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <button onClick={() => onSave(participant.id, { fullName, phone, status, assignedMentorId: assignedMentorId || null })}>
          שמור
        </button>
        <button onClick={onCancel}>בטל</button>
      </td>
    </tr>
  )
}
```

- [ ] **Step 3: Typecheck + build**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx tsc --noEmit
NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co" NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder" npm run build
```

- [ ] **Step 4: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/participants/page.tsx hachamama-parenting-program/mentor-dashboard/src/app/participants/participants-table.tsx
git commit -m "feat(mentor-dashboard): add participant add/edit/delete UI with mentor assignment"
```

---

## Task 6: Final review + docs + merge + push

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/README.md`

- [ ] **Step 1: Add a short section to `mentor-dashboard/README.md`** after "## מסך תכנים":

```markdown
## ניהול נרשמים (`/participants`)

מסך הנרשמים כולל גם הוספה/עריכה/מחיקה, לא רק צפייה — כולל הצמדת "מנחה אחראית"
(תגית ארגונית בלבד, לא מגבילה מי רואה מה — כל מנחה עדיין רואה את כל הנרשמים).
מחיקה חסומה אם לנרשם כבר יש היסטוריית הודעות/סרטונים — יש להשהות (`paused`) במקום.
דורש migration `0005_participant_management.sql`.
```

- [ ] **Step 2: Full verification**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx vitest run
npx tsc --noEmit
npm run build
```

Expected: everything green.

- [ ] **Step 3: Commit + merge + push**

```bash
git add hachamama-parenting-program/mentor-dashboard/README.md
git commit -m "docs(mentor-dashboard): document participant management and mentor assignment"
```

Then follow the same merge-to-main flow used for the previous plans this session (merge the worktree branch into `main`, verify tests on the merged result, push, clean up the worktree).

- [ ] **Step 4: Report back**

Confirm to the user: participant add/edit/delete is live in `/participants` once they've deployed (same pending Vercel+migration steps as the rest of `mentor-dashboard/`), and that Plan C (questionnaires) is next.
