# Content Management (Plan B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the project owner and mentors a comfortable, Airtable-like screen to add/edit/delete WhatsApp content (`content_days`/`messages`) — replacing direct Supabase Table Editor use.

**Architecture:** A new `/content` route inside the **same** `hachamama-parenting-program/mentor-dashboard/` Next.js app built for Plan D (not a separate app) — reuses the same Supabase Auth session, the same `mentors` table, and the same server/browser Supabase client helpers from Plan D's Task 6. `mentors` gain RLS **write** access on `content_days`/`messages` (and on the `media` Storage bucket) via a new migration; their existing read-only access to `participants`/`daily_triggers`/`message_deliveries` (Plan D) is untouched. All mutations happen directly from the browser via the Supabase client (RLS-enforced) — no new API routes or Server Actions needed for CRUD.

**Prerequisite:** Plan D's Task 6 (`src/lib/supabase/server.ts`, `client.ts`) must exist before this plan's Task 4. If Plan D hasn't reached Task 6 yet, do that first.

**Tech Stack:** Next.js 15 (Client Components for the interactive grid — this plan is the first place `mentor-dashboard` needs client-side interactivity), `@supabase/supabase-js`, Vitest for pure logic.

**Screen design (from brainstorming session, 2026-08-04):** one continuous grid across all 448 days with a sticky header row per day (not paginated per-day, not a flat table with no grouping). Text cells edit inline (click → becomes an input, save on blur/Enter). Each row also has an expand button that opens a right-side panel with a full form — used for anything inline editing is bad at: long text, and drag-and-drop media upload.

---

## File Structure

```
hachamama-parenting-program/
  server/
    migrations/
      0003_mentor_content_write.sql   # NEW — mentor write RLS on content_days/messages + media bucket
  mentor-dashboard/
    src/
      lib/
        content-data-source.ts        # NEW — ContentDataSource interface + Supabase-backed impl
        content-view.ts               # NEW — pure logic: day-grouping, media validation
        content-view.test.ts          # NEW
      app/
        content/
          page.tsx                    # NEW — Server Component, fetches initial data
          content-grid.tsx            # NEW — Client Component, the interactive grid
          edit-panel.tsx              # NEW — Client Component, side panel (media upload, full text)
        participants/
          page.tsx                    # MODIFY (Plan D) — add nav link to /content
```

Why `content-data-source.ts` is separate from `content-view.ts`: same reasoning as Plan D's `mentor-data-source.ts`/`mentor-view.ts` split — a thin Supabase adapter (untested directly) plus pure shaping/validation logic (tested against a hand-written fake of the interface).

---

## Task 1: Migration — mentor write access on content tables + media bucket

**Files:**
- Create: `hachamama-parenting-program/server/migrations/0003_mentor_content_write.sql`

- [ ] **Step 1: Write the migration**

```sql
-- hachamama-parenting-program/server/migrations/0003_mentor_content_write.sql
-- מוסיף למנחות (טבלת mentors, ראו 0002_mentor_rls.sql) גישת read-write על content_days/messages
-- ועל bucket ה-Storage 'media' — לצורך מסך ניהול התוכן (Plan B). לא נוגע בהרשאות הקריאה-בלבד
-- הקיימות על participants/daily_triggers/message_deliveries (Plan D) — אלה נשארות כמו שהן.

create policy content_days_insert_mentor on content_days
  for insert to authenticated
  with check (exists (select 1 from mentors where user_id = auth.uid()));

create policy content_days_update_mentor on content_days
  for update to authenticated
  using (exists (select 1 from mentors where user_id = auth.uid()))
  with check (exists (select 1 from mentors where user_id = auth.uid()));

create policy content_days_delete_mentor on content_days
  for delete to authenticated
  using (exists (select 1 from mentors where user_id = auth.uid()));

create policy messages_insert_mentor on messages
  for insert to authenticated
  with check (exists (select 1 from mentors where user_id = auth.uid()));

create policy messages_update_mentor on messages
  for update to authenticated
  using (exists (select 1 from mentors where user_id = auth.uid()))
  with check (exists (select 1 from mentors where user_id = auth.uid()));

create policy messages_delete_mentor on messages
  for delete to authenticated
  using (exists (select 1 from mentors where user_id = auth.uid()));

-- Storage RLS (storage.objects) — נפרד מ-RLS על טבלאות ה-public schema. ה-bucket 'media' הוא
-- public=true (כך שקישורי media_url ציבוריים לקריאה, כמו שהוגדר ב-Plan A), אבל זה משפיע רק
-- על SELECT — כתיבה (upload) דורשת policy מפורש גם ב-bucket "ציבורי".
create policy mentors_insert_media on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and exists (select 1 from mentors where user_id = auth.uid()));

create policy mentors_update_media on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and exists (select 1 from mentors where user_id = auth.uid()));

create policy mentors_delete_media on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and exists (select 1 from mentors where user_id = auth.uid()));
```

- [ ] **Step 2: Run it against the real Supabase project**

Same project as `0001_init.sql`/`0002_mentor_rls.sql` (`lqhpfrhiiboshsoqnfdz.supabase.co`). Run in the SQL editor. Expected: "Success. No rows returned."

- [ ] **Step 3: Verify**

```sql
select tablename, policyname from pg_policies where policyname like '%mentor%';
```

Expected: the 6 policies from `0002_mentor_rls.sql` plus 6 new ones from this file (`content_days_insert_mentor`, `content_days_update_mentor`, `content_days_delete_mentor`, `messages_insert_mentor`, `messages_update_mentor`, `messages_delete_mentor`), plus `mentors_insert_media`/`mentors_update_media`/`mentors_delete_media` on `storage.objects` (these won't show `tablename` matching the others — check with `select policyname from pg_policies where policyname like '%media%'` instead if the first query misses them).

- [ ] **Step 4: Commit**

```bash
git add hachamama-parenting-program/server/migrations/0003_mentor_content_write.sql
git commit -m "feat(hachamama): add mentor write RLS on content tables + media bucket for content management"
```

---

## Task 2: `ContentDataSource` — interface + Supabase-backed implementation

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/lib/content-data-source.ts`

No test in this task — thin Supabase adapter, same convention as `mentor-data-source.ts` (Plan D Task 4).

- [ ] **Step 1: Write the interface + implementation**

```ts
// hachamama-parenting-program/mentor-dashboard/src/lib/content-data-source.ts
// שכבת גישה ל-Supabase למסך ניהול התוכן — thin adapter, לא נבדק ישירות (כמו mentor-data-source.ts).
// הלוגיקה שכן שווה בדיקה נמצאת ב-content-view.ts.
import type { SupabaseClient } from '@supabase/supabase-js'

export type MediaType = 'image' | 'video' | 'audio' | 'document'

export interface ContentDayRecord {
  day_number: number
  title: string | null
}

export interface MessageRecord {
  id: string
  content_day_number: number
  send_offset_time: string
  order_in_day: number
  body_text: string
  media_url: string | null
  media_type: MediaType | null
}

export interface ContentDataSource {
  listAllContentDays(): Promise<ContentDayRecord[]>
  listAllMessages(): Promise<MessageRecord[]>
  ensureContentDay(dayNumber: number): Promise<void>
  createMessage(input: { contentDayNumber: number; sendOffsetTime: string; orderInDay: number }): Promise<MessageRecord>
  updateMessageBody(id: string, bodyText: string): Promise<void>
  updateMessageMedia(id: string, mediaUrl: string | null, mediaType: MediaType | null): Promise<void>
  deleteMessage(id: string): Promise<void>
  hasDeliveries(messageId: string): Promise<boolean>
  uploadMedia(file: File, contentDayNumber: number): Promise<{ url: string; path: string }>
}

export function createSupabaseContentDataSource(supabase: SupabaseClient): ContentDataSource {
  return {
    async listAllContentDays() {
      const { data, error } = await supabase.from('content_days').select('day_number, title').order('day_number', { ascending: true })
      if (error) throw error
      return data as ContentDayRecord[]
    },

    async listAllMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content_day_number, send_offset_time, order_in_day, body_text, media_url, media_type')
        .order('content_day_number', { ascending: true })
        .order('order_in_day', { ascending: true })
      if (error) throw error
      return data as MessageRecord[]
    },

    async ensureContentDay(dayNumber) {
      const { error } = await supabase.from('content_days').upsert({ day_number: dayNumber }, { onConflict: 'day_number', ignoreDuplicates: true })
      if (error) throw error
    },

    async createMessage(input) {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content_day_number: input.contentDayNumber,
          send_offset_time: input.sendOffsetTime,
          order_in_day: input.orderInDay,
          body_text: '',
          media_url: null,
          media_type: null,
        })
        .select('id, content_day_number, send_offset_time, order_in_day, body_text, media_url, media_type')
        .single()
      if (error) throw error
      return data as MessageRecord
    },

    async updateMessageBody(id, bodyText) {
      const { error } = await supabase.from('messages').update({ body_text: bodyText }).eq('id', id)
      if (error) throw error
    },

    async updateMessageMedia(id, mediaUrl, mediaType) {
      const { error } = await supabase.from('messages').update({ media_url: mediaUrl, media_type: mediaType }).eq('id', id)
      if (error) throw error
    },

    async deleteMessage(id) {
      const { error } = await supabase.from('messages').delete().eq('id', id)
      if (error) throw error
    },

    async hasDeliveries(messageId) {
      const { count, error } = await supabase
        .from('message_deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('message_id', messageId)
      if (error) throw error
      return (count ?? 0) > 0
    },

    async uploadMedia(file, contentDayNumber) {
      const path = `content-day-${contentDayNumber}/${crypto.randomUUID()}-${file.name}`
      const { error } = await supabase.storage.from('media').upload(path, file)
      if (error) throw error
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      return { url: data.publicUrl, path }
    },
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/lib/content-data-source.ts
git commit -m "feat(mentor-dashboard): add Supabase-backed ContentDataSource"
```

---

## Task 3: Pure logic — `content-view.ts` (day grouping + media validation)

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/lib/content-view.ts`
- Test: `hachamama-parenting-program/mentor-dashboard/src/lib/content-view.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// hachamama-parenting-program/mentor-dashboard/src/lib/content-view.test.ts
import { describe, expect, it } from 'vitest'
import { groupMessagesByDay, validateMediaFile } from './content-view'
import type { MessageRecord } from './content-data-source'

describe('groupMessagesByDay', () => {
  it('מקבץ הודעות לפי יום, ממוין לפי יום ואז לפי order_in_day', () => {
    const days = [{ day_number: 1, title: null }, { day_number: 2, title: 'שבוע 1' }]
    const messages: MessageRecord[] = [
      { id: 'm2', content_day_number: 2, send_offset_time: '06:45', order_in_day: 0, body_text: 'יום 2', media_url: null, media_type: null },
      { id: 'm1b', content_day_number: 1, send_offset_time: '06:50', order_in_day: 1, body_text: 'שני', media_url: null, media_type: null },
      { id: 'm1a', content_day_number: 1, send_offset_time: '06:45', order_in_day: 0, body_text: 'ראשון', media_url: null, media_type: null },
    ]

    const groups = groupMessagesByDay(days, messages)

    expect(groups.map((g) => g.dayNumber)).toEqual([1, 2])
    expect(groups[0].title).toBeNull()
    expect(groups[1].title).toBe('שבוע 1')
    expect(groups[0].messages.map((m) => m.id)).toEqual(['m1a', 'm1b'])
  })

  it('יום בלי הודעות מופיע עדיין בקבוצה, עם רשימה ריקה', () => {
    const days = [{ day_number: 1, title: null }]
    const groups = groupMessagesByDay(days, [])
    expect(groups).toEqual([{ dayNumber: 1, title: null, messages: [] }])
  })
})

describe('validateMediaFile', () => {
  it('מקבל תמונה בגודל תקין ומחזיר את media_type הנכון', () => {
    const result = validateMediaFile({ name: 'a.png', size: 1024, type: 'image/png' })
    expect(result).toEqual({ ok: true, mediaType: 'image' })
  })

  it('דוחה קובץ גדול מהמקסימום', () => {
    const result = validateMediaFile({ name: 'a.png', size: 50 * 1024 * 1024, type: 'image/png' })
    expect(result.ok).toBe(false)
  })

  it('דוחה סוג קובץ לא נתמך', () => {
    const result = validateMediaFile({ name: 'a.exe', size: 1024, type: 'application/x-msdownload' })
    expect(result.ok).toBe(false)
  })

  it('מזהה document (pdf/docx) בנוסף לתמונה/וידאו/אודיו', () => {
    expect(validateMediaFile({ name: 'a.pdf', size: 1024, type: 'application/pdf' })).toEqual({ ok: true, mediaType: 'document' })
    expect(validateMediaFile({ name: 'a.mp4', size: 1024, type: 'video/mp4' })).toEqual({ ok: true, mediaType: 'video' })
    expect(validateMediaFile({ name: 'a.mp3', size: 1024, type: 'audio/mpeg' })).toEqual({ ok: true, mediaType: 'audio' })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx vitest run src/lib/content-view.test.ts
```

Expected: FAIL — `Cannot find module './content-view'`.

- [ ] **Step 3: Write the implementation**

```ts
// hachamama-parenting-program/mentor-dashboard/src/lib/content-view.ts
// לוגיקה טהורה: קיבוץ הודעות לפי יום לתצוגה, וולידציית קובצי מדיה לפני העלאה.
import type { ContentDayRecord, MediaType, MessageRecord } from './content-data-source'

export interface DayGroup {
  dayNumber: number
  title: string | null
  messages: MessageRecord[]
}

export function groupMessagesByDay(days: ContentDayRecord[], messages: MessageRecord[]): DayGroup[] {
  const messagesByDay = new Map<number, MessageRecord[]>()
  for (const m of messages) {
    if (!messagesByDay.has(m.content_day_number)) messagesByDay.set(m.content_day_number, [])
    messagesByDay.get(m.content_day_number)!.push(m)
  }
  for (const list of messagesByDay.values()) {
    list.sort((a, b) => a.order_in_day - b.order_in_day)
  }

  return [...days]
    .sort((a, b) => a.day_number - b.day_number)
    .map((d) => ({
      dayNumber: d.day_number,
      title: d.title,
      messages: messagesByDay.get(d.day_number) ?? [],
    }))
}

const MAX_MEDIA_SIZE_BYTES = 20 * 1024 * 1024 // 20MB — גדול מספיק לתמונה/סרטון קצר, קטן מספיק לא לחסום שליחה ב-WhatsApp

const MIME_TO_MEDIA_TYPE: Record<string, MediaType> = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
  'video/quicktime': 'video',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
}

export type MediaValidationResult = { ok: true; mediaType: MediaType } | { ok: false; error: string }

export function validateMediaFile(file: { name: string; size: number; type: string }): MediaValidationResult {
  if (file.size > MAX_MEDIA_SIZE_BYTES) {
    return { ok: false, error: `הקובץ גדול מ-${MAX_MEDIA_SIZE_BYTES / (1024 * 1024)}MB` }
  }
  const mediaType = MIME_TO_MEDIA_TYPE[file.type]
  if (!mediaType) {
    return { ok: false, error: `סוג קובץ לא נתמך: ${file.type}` }
  }
  return { ok: true, mediaType }
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npx vitest run src/lib/content-view.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/lib/content-view.ts hachamama-parenting-program/mentor-dashboard/src/lib/content-view.test.ts
git commit -m "feat(mentor-dashboard): add content day-grouping and media validation logic"
```

---

## Task 4: Content page + interactive grid (Client Component)

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/content/page.tsx`
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/content/content-grid.tsx`

Requires Plan D's Task 6 (`src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`) to exist first.

- [ ] **Step 1: Write `src/app/content/page.tsx`** (Server Component — fetches initial data once, passes to the client grid)

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/content/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseContentDataSource } from '@/lib/content-data-source'
import { groupMessagesByDay } from '@/lib/content-view'
import { ContentGrid } from './content-grid'

export default async function ContentPage() {
  const supabase = await createSupabaseServerClient()
  const dataSource = createSupabaseContentDataSource(supabase)
  const [days, messages] = await Promise.all([dataSource.listAllContentDays(), dataSource.listAllMessages()])
  const initialGroups = groupMessagesByDay(days, messages)

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>תכנים</h1>
      <ContentGrid initialGroups={initialGroups} />
    </main>
  )
}
```

- [ ] **Step 2: Write `src/app/content/content-grid.tsx`** (Client Component — the interactive grid)

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/content/content-grid.tsx
'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { createSupabaseContentDataSource } from '@/lib/content-data-source'
import type { DayGroup } from '@/lib/content-view'
import { EditPanel } from './edit-panel'

export function ContentGrid({ initialGroups }: { initialGroups: DayGroup[] }) {
  const [groups, setGroups] = useState(initialGroups)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [panelMessageId, setPanelMessageId] = useState<string | null>(null)
  const dataSource = createSupabaseContentDataSource(createSupabaseBrowserClient())

  async function handleBodySave(messageId: string, dayNumber: number, newBody: string) {
    await dataSource.updateMessageBody(messageId, newBody)
    setGroups((prev) =>
      prev.map((g) =>
        g.dayNumber !== dayNumber
          ? g
          : { ...g, messages: g.messages.map((m) => (m.id === messageId ? { ...m, body_text: newBody } : m)) },
      ),
    )
    setEditingMessageId(null)
  }

  async function handleAddMessage(dayNumber: number) {
    await dataSource.ensureContentDay(dayNumber)
    const orderInDay = groups.find((g) => g.dayNumber === dayNumber)?.messages.length ?? 0
    const created = await dataSource.createMessage({ contentDayNumber: dayNumber, sendOffsetTime: '06:45', orderInDay })
    setGroups((prev) => prev.map((g) => (g.dayNumber !== dayNumber ? g : { ...g, messages: [...g.messages, created] })))
  }

  async function handleDelete(messageId: string, dayNumber: number) {
    const hasDeliveries = await dataSource.hasDeliveries(messageId)
    if (hasDeliveries && !window.confirm('ההודעה הזו כבר נשלחה/מתוזמנת למישהו. למחוק בכל זאת?')) return
    if (!hasDeliveries && !window.confirm('למחוק את ההודעה?')) return
    await dataSource.deleteMessage(messageId)
    setGroups((prev) => prev.map((g) => (g.dayNumber !== dayNumber ? g : { ...g, messages: g.messages.filter((m) => m.id !== messageId) })))
  }

  function handleMediaSaved(messageId: string, dayNumber: number, mediaUrl: string, mediaType: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.dayNumber !== dayNumber
          ? g
          : {
              ...g,
              messages: g.messages.map((m) => (m.id === messageId ? { ...m, media_url: mediaUrl, media_type: mediaType as never } : m)),
            },
      ),
    )
  }

  const panelMessage = groups.flatMap((g) => g.messages).find((m) => m.id === panelMessageId) ?? null

  return (
    <div>
      {groups.map((group) => (
        <div key={group.dayNumber}>
          <div
            style={{
              position: 'sticky',
              top: 0,
              background: 'var(--surface-1, #f5f5f5)',
              fontWeight: 500,
              padding: '4px 8px',
              zIndex: 1,
            }}
          >
            יום {group.dayNumber} {group.title ? `— ${group.title}` : ''}
          </div>
          {group.messages.map((message) => (
            <div
              key={message.id}
              style={{ display: 'grid', gridTemplateColumns: '60px 1fr 60px 90px', gap: 8, padding: '4px 8px', alignItems: 'center' }}
            >
              <span>{message.send_offset_time}</span>
              {editingMessageId === message.id ? (
                <input
                  autoFocus
                  defaultValue={message.body_text}
                  onBlur={(e) => handleBodySave(message.id, group.dayNumber, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  }}
                />
              ) : (
                <span onClick={() => setEditingMessageId(message.id)} style={{ cursor: 'text' }}>
                  {message.body_text || '(ריק)'}
                </span>
              )}
              <span>{message.media_url ? '🖼' : '-'}</span>
              <span>
                <button onClick={() => setPanelMessageId(message.id)}>⤢</button>
                <button onClick={() => handleDelete(message.id, group.dayNumber)}>🗑</button>
              </span>
            </div>
          ))}
          <button onClick={() => handleAddMessage(group.dayNumber)}>+ הודעה</button>
        </div>
      ))}

      {panelMessage && (
        <EditPanel
          message={panelMessage}
          onClose={() => setPanelMessageId(null)}
          onBodySave={(body) => handleBodySave(panelMessage.id, panelMessage.content_day_number, body)}
          onMediaSaved={(url, type) => handleMediaSaved(panelMessage.id, panelMessage.content_day_number, url, type)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx tsc --noEmit
```

Expected: fails only on the missing `./edit-panel` import — expected, that's Task 5. Confirm no *other* errors.

- [ ] **Step 4: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/content/page.tsx hachamama-parenting-program/mentor-dashboard/src/app/content/content-grid.tsx
git commit -m "feat(mentor-dashboard): add content grid page with inline text editing"
```

---

## Task 5: Edit side panel (media upload + full text)

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/content/edit-panel.tsx`

- [ ] **Step 1: Write the component**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/content/edit-panel.tsx
'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { createSupabaseContentDataSource } from '@/lib/content-data-source'
import { validateMediaFile } from '@/lib/content-view'
import type { MessageRecord } from '@/lib/content-data-source'

export function EditPanel({
  message,
  onClose,
  onBodySave,
  onMediaSaved,
}: {
  message: MessageRecord
  onClose: () => void
  onBodySave: (body: string) => void
  onMediaSaved: (url: string, mediaType: string) => void
}) {
  const [body, setBody] = useState(message.body_text)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const dataSource = createSupabaseContentDataSource(createSupabaseBrowserClient())

  async function handleFile(file: File) {
    const validation = validateMediaFile(file)
    if (!validation.ok) {
      setError(validation.error)
      return
    }
    setError(null)
    setUploading(true)
    try {
      const { url } = await dataSource.uploadMedia(file, message.content_day_number)
      await dataSource.updateMessageMedia(message.id, url, validation.mediaType)
      onMediaSaved(url, validation.mediaType)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 360,
        height: '100%',
        background: 'white',
        borderLeft: '1px solid #ddd',
        padding: 16,
        overflowY: 'auto',
      }}
    >
      <button onClick={onClose}>✕ סגור</button>
      <h3>
        יום {message.content_day_number}, {message.send_offset_time}
      </h3>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => onBodySave(body)}
        rows={8}
        style={{ width: '100%' }}
      />
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        style={{ border: '1px dashed #999', borderRadius: 8, padding: 16, marginTop: 12, textAlign: 'center' }}
      >
        {message.media_url ? (
          <p>מדיה קיימת: {message.media_type}</p>
        ) : (
          <p>גרור קובץ לפה, או:</p>
        )}
        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        {uploading && <p>מעלה...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual verification checklist**

```bash
npm run dev
```

1. Log in as a mentor (or the project owner's mentor account), visit `/content`.
2. Confirm all days render with sticky headers while scrolling.
3. Click a message's text → edit inline → blur → refresh page → confirm the edit persisted (check Supabase Table Editor if needed, just to verify — not as the ongoing workflow).
4. Click ⤢ on a message → side panel opens → drag an image onto the drop zone → confirm it uploads and `media_url`/`media_type` update (grid shows 🖼 after closing the panel).
5. Click "+ הודעה" on a day → confirm a new empty message row appears and persists after refresh.
6. Click 🗑 on a message with no deliveries → confirm single warning → delete → row disappears.
7. Try uploading a `.exe` file → confirm it's rejected with a clear error, nothing uploaded.

- [ ] **Step 4: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/content/edit-panel.tsx
git commit -m "feat(mentor-dashboard): add media upload side panel for content editing"
```

---

## Task 6: Navigation link + README update

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/app/participants/page.tsx`
- Modify: `hachamama-parenting-program/mentor-dashboard/README.md`

- [ ] **Step 1: Add a nav link in the participants page header**

In `src/app/participants/page.tsx`, inside the header `<div>` that currently holds `<h1>נרשמים</h1>` and the sign-out form, add a link:

```tsx
<Link href="/content">תכנים</Link>
```

(next to the existing `signOut` form — both inside the same flex header row).

- [ ] **Step 2: Update README.md**

Add a section after "## יצירת מנחה חדשה":

```markdown
## מסך תכנים (`/content`)

אותה כניסת מנחה משמשת גם לעריכת תכנים — לא רק לצפייה בנרשמים. גריד רציף של כל 448 הימים,
עריכת טקסט inline, פאנל צד להעלאת מדיה (drag-and-drop, נשמר ל-Supabase Storage bucket `media`).
דורש migration `0003_mentor_content_write.sql` (RLS write על content_days/messages + bucket policies).
```

- [ ] **Step 3: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/participants/page.tsx hachamama-parenting-program/mentor-dashboard/README.md
git commit -m "feat(mentor-dashboard): link content screen from participants nav"
```

---

## Task 7: Final review

- [ ] **Step 1: Full typecheck**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx tsc --noEmit
```

- [ ] **Step 2: Full test suite**

```bash
npx vitest run
```

Expected: all tests pass (program-day, mentor-view, content-view).

- [ ] **Step 3: Full production build**

```bash
npm run build
```

- [ ] **Step 4: Re-read the brainstormed design (`docs/2026-07-31-design.md` § "ממשק ניהול תוכן") against what was built**

Confirm: same app as dashboard (✅), mentors + owner both get write access (✅ Task 1), continuous grid with sticky day headers (✅ Task 4), inline text + side-panel media (✅ Tasks 4-5), add/delete with delivery warning (✅ Task 4), media type/size validation (✅ Task 3).

- [ ] **Step 5: Push**

```bash
git push origin main
```
