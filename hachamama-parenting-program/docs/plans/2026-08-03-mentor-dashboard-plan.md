# Mentor Dashboard (Plan D) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only web dashboard where mentors (מנחות) log in and see all participants — who hasn't clicked today's button, and each participant's full message-delivery history.

**Architecture:** A new, independently-deployed Next.js 15 (App Router) app at `hachamama-parenting-program/mentor-dashboard/`, separate from the existing Hono `server/`. It talks **directly to Supabase** (not through the Hono API) using the `@supabase/ssr` package for cookie-based session auth. Mentors authenticate via Supabase Auth (email+password); a new `mentors` table + Postgres RLS policies (added by migration `0002_mentor_rls.sql` in the existing `server/migrations/`) grant mentors read-only `SELECT` on `participants`, `content_days`, `messages`, `daily_triggers`, `message_deliveries` — nothing else, and no write access anywhere. The browser only ever holds the Supabase **anon key** (safe to expose — RLS is what actually restricts access), never the service-role key.

This matches the exact scope in `hachamama-parenting-program/docs/2026-07-31-design.md` § "דשבורד מנחות (Read-Only)": login, participant list with today's-click status, participant detail with delivery history, no send capability, no mentor↔participant assignment. Forms/questionnaires ("תשובות לשאלונים") are explicitly **out of scope for this plan** — Plan C (questionnaires) hasn't been built yet, there is no `forms`/`form_responses` table in the schema, so there is nothing to show. Add that section when Plan C ships.

**Tech Stack:** Next.js 15 (App Router, Server Components + Server Actions), TypeScript, `@supabase/supabase-js` + `@supabase/ssr`, Luxon (date math), Vitest (pure-logic unit tests only — no component/E2E tests in this plan, matching the project's existing testing depth for `server/`).

---

## File Structure

```
hachamama-parenting-program/
  server/
    migrations/
      0002_mentor_rls.sql          # NEW — mentors table + RLS select policies
  mentor-dashboard/                # NEW app, sibling to server/
    package.json
    tsconfig.json
    next.config.mjs
    vitest.config.ts
    .gitignore
    .env.example
    README.md
    src/
      lib/
        program-day.ts             # pure date logic (day1_date → program day, Israel date)
        program-day.test.ts
        mentor-data-source.ts      # MentorDataSource interface + Supabase-backed impl
        mentor-view.ts             # pure shaping: participant list + participant detail
        mentor-view.test.ts
        supabase/
          server.ts                # Supabase client for Server Components/Actions (cookies)
          client.ts                # Supabase client for the browser (login form)
      middleware.ts                # redirects unauthenticated → /login, authenticated away from /login
      app/
        layout.tsx
        page.tsx                   # redirects to /participants
        login/
          page.tsx
          actions.ts                # signIn/signOut Server Actions
        participants/
          page.tsx                 # list
          [id]/
            page.tsx                # detail
```

Why `mentor-data-source.ts` is split from `mentor-view.ts`: it mirrors the existing `AppDB` pattern in `server/src/repository/interface.ts` — an interface with a thin Supabase-backed implementation (untested directly, same as `server/src/repository/supabase-impl.ts`) plus pure shaping logic that *is* unit-tested against a hand-written fake. Same reasoning the codebase already uses: fluent query builders are painful to mock directly; a small interface isn't.

---

## Task 1: Migration — `mentors` table + RLS read policies

**Files:**
- Create: `hachamama-parenting-program/server/migrations/0002_mentor_rls.sql`

- [ ] **Step 1: Write the migration**

```sql
-- hachamama-parenting-program/server/migrations/0002_mentor_rls.sql
-- מוסיף גישת קריאה-בלבד למנחות (Plan D — דשבורד מנחות), ראו design doc § "דשבורד מנחות".
-- מנחה = משתמש ב-Supabase Auth (auth.users) שיש לו שורה בטבלת mentors. הדשבורד עצמו
-- (mentor-dashboard/) מתחבר ל-Supabase עם anon key בלבד — ה-RLS כאן הוא קו ההגנה היחיד.

create table mentors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

alter table mentors enable row level security;

-- מנחה יכול לקרוא רק את השורה של עצמו — נדרש כדי שהאפליקציה תוכל לבדוק "האם אני מנחה"
-- מצד הלקוח בלי service role.
create policy mentors_select_self on mentors
  for select using (auth.uid() = user_id);

-- SECURITY: כל policy כאן היא SELECT בלבד — אין ל-mentors שום יכולת כתיבה על שום טבלה.
-- בלי ה-exists הזה, RLS המופעל בלי policies (ראו 0001_init.sql) חוסם את כל
-- ה-authenticated role, מה שבלעדיו היה חוסם גם את המנחות בטעות.
create policy participants_select_mentor on participants
  for select using (exists (select 1 from mentors where user_id = auth.uid()));

create policy content_days_select_mentor on content_days
  for select using (exists (select 1 from mentors where user_id = auth.uid()));

create policy messages_select_mentor on messages
  for select using (exists (select 1 from mentors where user_id = auth.uid()));

create policy daily_triggers_select_mentor on daily_triggers
  for select using (exists (select 1 from mentors where user_id = auth.uid()));

create policy message_deliveries_select_mentor on message_deliveries
  for select using (exists (select 1 from mentors where user_id = auth.uid()));

-- session_windows בכוונה לא נגישה למנחות — לא חלק מה-scope שבמסמך העיצוב.
```

- [ ] **Step 2: Run it against the real Supabase project**

Open the Supabase project's SQL editor (same project as `server/migrations/0001_init.sql` was run in — `lqhpfrhiiboshsoqnfdz.supabase.co`) and run the file's contents. Expected: "Success. No rows returned."

- [ ] **Step 3: Verify the policies exist**

Run in the same SQL editor:

```sql
select tablename, policyname from pg_policies where policyname like '%mentor%';
```

Expected: 6 rows (`mentors_select_self`, and one `*_select_mentor` policy per table: `participants`, `content_days`, `messages`, `daily_triggers`, `message_deliveries`).

- [ ] **Step 4: Commit**

```bash
git add hachamama-parenting-program/server/migrations/0002_mentor_rls.sql
git commit -m "feat(hachamama): add mentors table and read-only RLS policies for mentor dashboard"
```

---

## Task 2: Scaffold the Next.js app

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/package.json`
- Create: `hachamama-parenting-program/mentor-dashboard/tsconfig.json`
- Create: `hachamama-parenting-program/mentor-dashboard/next.config.mjs`
- Create: `hachamama-parenting-program/mentor-dashboard/vitest.config.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/.gitignore`
- Create: `hachamama-parenting-program/mentor-dashboard/.env.example`
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/layout.tsx`
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/page.tsx`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@hachamama/mentor-dashboard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.49.8",
    "luxon": "^3.5.0",
    "next": "^15.0.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/luxon": "^3.4.2",
    "@types/node": "^24.12.3",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.2",
    "typescript": "~6.0.2",
    "vitest": "^4.1.8"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {}
export default nextConfig
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/lib/**/*.test.ts'],
  },
})
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules
.next
.env
```

- [ ] **Step 6: Write `.env.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 7: Write `src/app/layout.tsx`**

```tsx
export const metadata = {
  title: 'החממה — דשבורד מנחות',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 8: Write `src/app/page.tsx`** (temporary placeholder — replaced by a redirect in Task 8)

```tsx
export default function RootPage() {
  return <p>Hachamama mentor dashboard — placeholder, replaced in Task 8.</p>
}
```

- [ ] **Step 9: Install and verify it boots**

```bash
cd hachamama-parenting-program/mentor-dashboard
npm install
npm run dev
```

Open `http://localhost:3000` — expect to see the placeholder text. Stop the dev server (Ctrl+C).

- [ ] **Step 10: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard
git commit -m "feat(mentor-dashboard): scaffold Next.js app"
```

---

## Task 3: Pure date logic — `program-day.ts`

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/lib/program-day.ts`
- Test: `hachamama-parenting-program/mentor-dashboard/src/lib/program-day.test.ts`

This intentionally duplicates two small functions from `server/src/domain/scheduling.ts` (`getIsraelDateString`, `calculateProgramDayNumber`). The two apps deploy independently; a shared package for ~15 lines of pure date math is not worth the coordination cost (YAGNI).

- [ ] **Step 1: Write the failing test**

```ts
// hachamama-parenting-program/mentor-dashboard/src/lib/program-day.test.ts
import { describe, expect, it } from 'vitest'
import { calculateProgramDayNumber, getIsraelDateString } from './program-day'

describe('calculateProgramDayNumber', () => {
  it('מחזיר 1 ביום ה-day1_date עצמו', () => {
    expect(calculateProgramDayNumber('2026-08-02', '2026-08-02')).toBe(1)
  })

  it('מחזיר 15 ב-day1_date + 14 יום', () => {
    expect(calculateProgramDayNumber('2026-08-02', '2026-08-16')).toBe(15)
  })
})

describe('getIsraelDateString', () => {
  it('ממיר רגע UTC לתאריך מקומי בישראל (קיץ, UTC+3)', () => {
    // 2026-08-02T21:30:00Z הוא כבר 2026-08-03 00:30 בישראל בקיץ
    expect(getIsraelDateString(new Date('2026-08-02T21:30:00Z'))).toBe('2026-08-03')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx vitest run src/lib/program-day.test.ts
```

Expected: FAIL — `Cannot find module './program-day'`.

- [ ] **Step 3: Write the implementation**

```ts
// hachamama-parenting-program/mentor-dashboard/src/lib/program-day.ts
// לוגיקת תאריכים טהורה — כפילות מכוונת וקטנה מ-server/src/domain/scheduling.ts
// (שתי אפליקציות עצמאיות ונפרסות בנפרד; לא הופך פונקציה של כמה שורות לחבילה משותפת — YAGNI).
import { DateTime } from 'luxon'

const ISRAEL_ZONE = 'Asia/Jerusalem'

/** התאריך המקומי בישראל של רגע נתון, כ-YYYY-MM-DD. */
export function getIsraelDateString(instant: Date): string {
  return DateTime.fromJSDate(instant).setZone(ISRAEL_ZONE).toISODate() as string
}

/** באיזה "יום בתוכנית" (1-based) הנרשם נמצא, בהינתן day1_date שלו והתאריך הנוכחי. */
export function calculateProgramDayNumber(day1Date: string, todayDate: string): number {
  const d1 = DateTime.fromISO(day1Date, { zone: 'utc' })
  const today = DateTime.fromISO(todayDate, { zone: 'utc' })
  const diffDays = today.diff(d1, 'days').days
  return Math.round(diffDays) + 1
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npx vitest run src/lib/program-day.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/lib/program-day.ts hachamama-parenting-program/mentor-dashboard/src/lib/program-day.test.ts
git commit -m "feat(mentor-dashboard): add program-day pure date logic"
```

---

## Task 4: `MentorDataSource` — interface + Supabase-backed implementation

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/lib/mentor-data-source.ts`

No test in this task — this is a thin Supabase adapter, same convention as `server/src/repository/supabase-impl.ts` (untested directly; the logic worth testing is pulled out into `mentor-view.ts` in Task 5, which *is* tested against a fake of this interface).

- [ ] **Step 1: Write the interface + implementation**

```ts
// hachamama-parenting-program/mentor-dashboard/src/lib/mentor-data-source.ts
// שכבת גישה ל-Supabase לצורכי הדשבורד — thin adapter, לא נבדק ישירות (כמו
// server/src/repository/supabase-impl.ts). הלוגיקה שכן שווה בדיקה נמצאת ב-mentor-view.ts,
// שמקבל MentorDataSource כפרמטר ונבדק מול fake פשוט.
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ParticipantRecord {
  id: string
  full_name: string
  phone: string
  status: string
  day1_date: string
}

export interface DailyTriggerRecord {
  participant_id: string
  clicked_at: string | null
}

export interface DeliveryRecord {
  message_id: string
  status: string
  sent_at: string | null
  scheduled_for: string
  content_day_number: number
  send_offset_time: string
  body_text: string
}

export interface MentorDataSource {
  listParticipants(): Promise<ParticipantRecord[]>
  getTriggersForDate(calendarDate: string): Promise<DailyTriggerRecord[]>
  getParticipant(id: string): Promise<ParticipantRecord | null>
  getDeliveriesForParticipant(participantId: string): Promise<DeliveryRecord[]>
}

// אין generated types ל-Supabase בפרויקט הזה (מגבלה ידועה, תואמת ל-server) — cast מפורש
// בנקודה היחידה שבה יש embedded relation (messages דרך message_deliveries).
interface DeliveryQueryRow {
  message_id: string
  status: string
  sent_at: string | null
  scheduled_for: string
  messages: { content_day_number: number; send_offset_time: string; body_text: string }
}

export function createSupabaseMentorDataSource(supabase: SupabaseClient): MentorDataSource {
  return {
    async listParticipants() {
      const { data, error } = await supabase
        .from('participants')
        .select('id, full_name, phone, status, day1_date')
        .order('full_name', { ascending: true })
      if (error) throw error
      return data as ParticipantRecord[]
    },

    async getTriggersForDate(calendarDate) {
      const { data, error } = await supabase
        .from('daily_triggers')
        .select('participant_id, clicked_at')
        .eq('calendar_date', calendarDate)
      if (error) throw error
      return data as DailyTriggerRecord[]
    },

    async getParticipant(id) {
      const { data, error } = await supabase
        .from('participants')
        .select('id, full_name, phone, status, day1_date')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return (data as ParticipantRecord | null) ?? null
    },

    async getDeliveriesForParticipant(participantId) {
      const { data, error } = await supabase
        .from('message_deliveries')
        .select('message_id, status, sent_at, scheduled_for, messages(content_day_number, send_offset_time, body_text)')
        .eq('participant_id', participantId)
        .order('scheduled_for', { ascending: true })
      if (error) throw error
      return (data as unknown as DeliveryQueryRow[]).map((row) => ({
        message_id: row.message_id,
        status: row.status,
        sent_at: row.sent_at,
        scheduled_for: row.scheduled_for,
        content_day_number: row.messages.content_day_number,
        send_offset_time: row.messages.send_offset_time,
        body_text: row.messages.body_text,
      }))
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
git add hachamama-parenting-program/mentor-dashboard/src/lib/mentor-data-source.ts
git commit -m "feat(mentor-dashboard): add Supabase-backed MentorDataSource"
```

---

## Task 5: Pure shaping logic — `mentor-view.ts`

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.ts`
- Test: `hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.test.ts
import { describe, expect, it } from 'vitest'
import type { MentorDataSource } from './mentor-data-source'
import { buildParticipantDetail, buildParticipantList } from './mentor-view'

function fakeDataSource(overrides: Partial<MentorDataSource> = {}): MentorDataSource {
  return {
    listParticipants: async () => [],
    getTriggersForDate: async () => [],
    getParticipant: async () => null,
    getDeliveriesForParticipant: async () => [],
    ...overrides,
  }
}

describe('buildParticipantList', () => {
  it('מחשב יום-תוכנית נכון ומסמן מי לחץ היום לפי daily_triggers', async () => {
    const dataSource = fakeDataSource({
      listParticipants: async () => [
        { id: 'p1', full_name: 'דנה כהן', phone: '+972500000001', status: 'active', day1_date: '2026-08-02' },
        { id: 'p2', full_name: 'אבי לוי', phone: '+972500000002', status: 'active', day1_date: '2026-08-02' },
      ],
      getTriggersForDate: async () => [{ participant_id: 'p1', clicked_at: '2026-08-16T06:00:00Z' }],
    })

    const result = await buildParticipantList(dataSource, new Date('2026-08-16T10:00:00Z'))

    expect(result).toEqual([
      { id: 'p1', fullName: 'דנה כהן', phone: '+972500000001', status: 'active', programDay: 15, clickedToday: true },
      { id: 'p2', fullName: 'אבי לוי', phone: '+972500000002', status: 'active', programDay: 15, clickedToday: false },
    ])
  })

  it('מנוי בלי daily_trigger היום מסומן כלא-לחץ, לא זורק שגיאה', async () => {
    const dataSource = fakeDataSource({
      listParticipants: async () => [
        { id: 'p1', full_name: 'דנה כהן', phone: '+972500000001', status: 'active', day1_date: '2026-08-02' },
      ],
      getTriggersForDate: async () => [],
    })

    const result = await buildParticipantList(dataSource, new Date('2026-08-16T10:00:00Z'))

    expect(result[0].clickedToday).toBe(false)
  })
})

describe('buildParticipantDetail', () => {
  it('מחזיר null כשהמנוי לא קיים', async () => {
    const dataSource = fakeDataSource({ getParticipant: async () => null })
    expect(await buildParticipantDetail(dataSource, 'missing')).toBeNull()
  })

  it('מחזיר פרטי מנוי + היסטוריית הודעות, ממוינת לפי scheduled_for וקטומה ל-60 תווים', async () => {
    const longBody = 'א'.repeat(80)
    const dataSource = fakeDataSource({
      getParticipant: async () => ({
        id: 'p1',
        full_name: 'דנה כהן',
        phone: '+972500000001',
        status: 'active',
        day1_date: '2026-08-02',
      }),
      getDeliveriesForParticipant: async () => [
        {
          message_id: 'm2',
          status: 'pending',
          sent_at: null,
          scheduled_for: '2026-08-16T13:45:00Z',
          content_day_number: 15,
          send_offset_time: '13:45',
          body_text: 'קצר',
        },
        {
          message_id: 'm1',
          status: 'sent',
          sent_at: '2026-08-16T06:50:00Z',
          scheduled_for: '2026-08-16T06:50:00Z',
          content_day_number: 15,
          send_offset_time: '06:50',
          body_text: longBody,
        },
      ],
    })

    const result = await buildParticipantDetail(dataSource, 'p1')

    expect(result?.fullName).toBe('דנה כהן')
    expect(result?.deliveries.map((d) => d.messageId)).toEqual(['m1', 'm2'])
    expect(result?.deliveries[0].bodyPreview).toBe(`${longBody.slice(0, 60)}…`)
    expect(result?.deliveries[1].bodyPreview).toBe('קצר')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx vitest run src/lib/mentor-view.test.ts
```

Expected: FAIL — `Cannot find module './mentor-view'`.

- [ ] **Step 3: Write the implementation**

```ts
// hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.ts
// לוגיקה טהורה שמעצבת נתונים לתצוגה — מקבלת MentorDataSource, לא יודעת שום דבר על Supabase.
// זה מה שהופך אותה לניתנת-לבדיקה בקלות מול fake (ראו mentor-view.test.ts).
import { calculateProgramDayNumber, getIsraelDateString } from './program-day'
import type { MentorDataSource } from './mentor-data-source'

export interface ParticipantListItem {
  id: string
  fullName: string
  phone: string
  status: string
  programDay: number
  clickedToday: boolean
}

export async function buildParticipantList(
  dataSource: MentorDataSource,
  now: Date,
): Promise<ParticipantListItem[]> {
  const todayDate = getIsraelDateString(now)
  const [participants, triggers] = await Promise.all([
    dataSource.listParticipants(),
    dataSource.getTriggersForDate(todayDate),
  ])
  const clickedByParticipant = new Map(triggers.map((t) => [t.participant_id, t.clicked_at !== null]))

  return participants.map((p) => ({
    id: p.id,
    fullName: p.full_name,
    phone: p.phone,
    status: p.status,
    programDay: calculateProgramDayNumber(p.day1_date, todayDate),
    clickedToday: clickedByParticipant.get(p.id) ?? false,
  }))
}

export interface DeliveryHistoryItem {
  messageId: string
  contentDayNumber: number
  sendOffsetTime: string
  bodyPreview: string
  status: string
  sentAt: string | null
}

export interface ParticipantDetailView {
  id: string
  fullName: string
  phone: string
  status: string
  day1Date: string
  deliveries: DeliveryHistoryItem[]
}

const BODY_PREVIEW_LENGTH = 60

export async function buildParticipantDetail(
  dataSource: MentorDataSource,
  participantId: string,
): Promise<ParticipantDetailView | null> {
  const participant = await dataSource.getParticipant(participantId)
  if (!participant) return null

  const deliveries = await dataSource.getDeliveriesForParticipant(participantId)

  return {
    id: participant.id,
    fullName: participant.full_name,
    phone: participant.phone,
    status: participant.status,
    day1Date: participant.day1_date,
    deliveries: [...deliveries]
      .sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for))
      .map((d) => ({
        messageId: d.message_id,
        contentDayNumber: d.content_day_number,
        sendOffsetTime: d.send_offset_time,
        bodyPreview:
          d.body_text.length > BODY_PREVIEW_LENGTH ? `${d.body_text.slice(0, BODY_PREVIEW_LENGTH)}…` : d.body_text,
        status: d.status,
        sentAt: d.sent_at,
      })),
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npx vitest run src/lib/mentor-view.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.ts hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.test.ts
git commit -m "feat(mentor-dashboard): add participant list/detail view logic"
```

---

## Task 6: Supabase auth plumbing — server client, browser client, middleware

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/lib/supabase/server.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/lib/supabase/client.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/middleware.ts`

No unit tests in this task — this is framework auth plumbing (cookie forwarding), verified end-to-end manually in Task 9's checklist, same as the rest of the codebase doesn't unit-test Hono route wiring itself beyond what `app.request()` integration tests cover.

- [ ] **Step 1: Write `src/lib/supabase/server.ts`**

```ts
// hachamama-parenting-program/mentor-dashboard/src/lib/supabase/server.ts
// Supabase client לשימוש ב-Server Components/Actions — קורא/כותב cookies של הבקשה
// הנוכחית כדי לשמור סשן. אנון key בלבד — הרשאות אמיתיות מגיעות מ-RLS (ראו migration 0002).
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // נקרא מתוך Server Component בלי אפשרות לכתוב cookies — מתעלמים בכוונה,
          // ה-middleware כבר מרפרש את הסשן בכל בקשה (ראו תיעוד @supabase/ssr).
        }
      },
    },
  })
}
```

- [ ] **Step 2: Write `src/lib/supabase/client.ts`**

```ts
// hachamama-parenting-program/mentor-dashboard/src/lib/supabase/client.ts
// Supabase client לשימוש ברכיבי דפדפן (client components).
import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
```

- [ ] **Step 3: Write `src/middleware.ts`**

```ts
// hachamama-parenting-program/mentor-dashboard/src/middleware.ts
// SECURITY: זו שכבת ההגנה הראשונה (UX-level redirect) — לא שכבת האבטחה האמיתית.
// ההגנה האמיתית היא RLS (migration 0002_mentor_rls.sql): גם אם מישהו יעקוף את
// ה-middleware, שאילתות ל-Supabase בלי סשן מנחה תקין יחזירו 0 שורות.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === '/login'
  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/participants', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 4: Typecheck**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/lib/supabase hachamama-parenting-program/mentor-dashboard/src/middleware.ts
git commit -m "feat(mentor-dashboard): add Supabase auth session plumbing (server/browser client, middleware)"
```

---

## Task 7: Login page + sign-in/sign-out Server Actions

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/login/actions.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/login/page.tsx`

- [ ] **Step 1: Write `src/app/login/actions.ts`**

```ts
// hachamama-parenting-program/mentor-dashboard/src/app/login/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function signIn(formData: FormData) {
  const email = formData.get('email')
  const password = formData.get('password')
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    redirect('/login?error=missing-fields')
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    redirect('/login?error=invalid-credentials')
  }

  redirect('/participants')
}

export async function signOut() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 2: Write `src/app/login/page.tsx`**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/login/page.tsx
import { signIn } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <main style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>כניסת מנחות</h1>
      <form action={signIn}>
        <label>
          אימייל
          <input name="email" type="email" required style={{ display: 'block', width: '100%', marginBottom: 12 }} />
        </label>
        <label>
          סיסמה
          <input name="password" type="password" required style={{ display: 'block', width: '100%', marginBottom: 12 }} />
        </label>
        <button type="submit">התחברות</button>
      </form>
      {error === 'invalid-credentials' && <p style={{ color: 'red' }}>אימייל או סיסמה שגויים</p>}
      {error === 'missing-fields' && <p style={{ color: 'red' }}>יש למלא אימייל וסיסמה</p>}
    </main>
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/login
git commit -m "feat(mentor-dashboard): add mentor login page"
```

---

## Task 8: Participant list page (root redirect included)

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/app/page.tsx`
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/participants/page.tsx`

- [ ] **Step 1: Replace the placeholder root page with a redirect**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/page.tsx
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/participants')
}
```

- [ ] **Step 2: Write `src/app/participants/page.tsx`**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/participants/page.tsx
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseMentorDataSource } from '@/lib/mentor-data-source'
import { buildParticipantList } from '@/lib/mentor-view'
import { signOut } from '../login/actions'

export default async function ParticipantsPage() {
  const supabase = await createSupabaseServerClient()
  const dataSource = createSupabaseMentorDataSource(supabase)
  const participants = await buildParticipantList(dataSource, new Date())

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>נרשמים</h1>
        <form action={signOut}>
          <button type="submit">התנתקות</button>
        </form>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'right' }}>שם</th>
            <th style={{ textAlign: 'right' }}>יום בתוכנית</th>
            <th style={{ textAlign: 'right' }}>לחץ היום?</th>
            <th style={{ textAlign: 'right' }}>סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.id} style={{ borderTop: '1px solid #ddd' }}>
              <td>
                <Link href={`/participants/${p.id}`}>{p.fullName}</Link>
              </td>
              <td>{p.programDay}</td>
              <td>{p.clickedToday ? '✅' : '❌'}</td>
              <td>{p.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/page.tsx hachamama-parenting-program/mentor-dashboard/src/app/participants/page.tsx
git commit -m "feat(mentor-dashboard): add participant list page"
```

---

## Task 9: Participant detail page

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/participants/[id]/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/participants/[id]/page.tsx
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseMentorDataSource } from '@/lib/mentor-data-source'
import { buildParticipantDetail } from '@/lib/mentor-view'

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const dataSource = createSupabaseMentorDataSource(supabase)
  const detail = await buildParticipantDetail(dataSource, id)
  if (!detail) notFound()

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>{detail.fullName}</h1>
      <p>
        טלפון: {detail.phone} | סטטוס: {detail.status} | יום 1: {detail.day1Date}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'right' }}>יום</th>
            <th style={{ textAlign: 'right' }}>שעה</th>
            <th style={{ textAlign: 'right' }}>תוכן</th>
            <th style={{ textAlign: 'right' }}>סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {detail.deliveries.map((d) => (
            <tr key={d.messageId} style={{ borderTop: '1px solid #ddd' }}>
              <td>{d.contentDayNumber}</td>
              <td>{d.sendOffsetTime}</td>
              <td>{d.bodyPreview}</td>
              <td>{d.status === 'sent' ? '✅ נשלח' : '⏳ ממתין'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
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

Requires a real mentor user (see Task 10's README for the exact steps to create one) and `.env` populated from `.env.example`. Run:

```bash
npm run dev
```

1. Visit `http://localhost:3000/` → redirected to `/login`.
2. Log in with a real mentor's email+password → redirected to `/participants`.
3. Confirm the table shows all 11 real participants with the correct program day (day 15+ as of today) and correct ✅/❌ click status.
4. Click a participant name → confirm the detail page shows their message-delivery history, ordered by time, with correct ✅/⏳ status per row.
5. Click "התנתקות" → redirected to `/login`; visiting `/participants` directly afterwards redirects back to `/login`.

- [ ] **Step 4: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/participants
git commit -m "feat(mentor-dashboard): add participant detail page"
```

---

## Task 10: README — mentor creation steps + Vercel deployment

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/README.md`

- [ ] **Step 1: Write the README**

```markdown
# Hachamama Mentor Dashboard (Plan D)

דשבורד קריאה-בלבד למנחות. מתחבר ישירות ל-Supabase (לא דרך `server/`), עם auth
של Supabase (email+password) ו-RLS שמגביל גישה לקריאה בלבד (ראו
`server/migrations/0002_mentor_rls.sql`). ראו `hachamama-parenting-program/docs/2026-07-31-design.md`
§ "דשבורד מנחות (Read-Only)" למפרט המקורי.

## הרצה בפיתוח

```bash
npm install
cp .env.example .env   # למלא NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

שני הערכים נמצאים ב-Supabase Project Settings → API — **ה-anon key, לא ה-service role key**
(ה-service role עוקף RLS ולעולם לא צריך להגיע לדפדפן).

## בדיקות

```bash
npm test
```

## יצירת מנחה חדשה

אין ממשק הרשמה עצמית בכוונה (מתאים למספר קטן של מנחות מוכרות). לכל מנחה חדשה:

1. Supabase Dashboard → Authentication → Users → **Add user** (או Invite, שישלח אימייל
   לבחירת סיסמה). לרשום את ה-UUID שנוצר.
2. ב-SQL editor של אותו פרויקט:

```sql
insert into mentors (user_id, full_name) values ('<uuid מהשלב הקודם>', '<שם המנחה>');
```

בלי השורה הזו ב-`mentors`, המשתמשת יכולה להתחבר (Auth מצליח) אבל תראה טבלה ריקה —
ה-RLS policies (migration 0002) דורשות שורה תואמת ב-`mentors`.

## פריסה ל-Vercel (חינמי, Hobby plan)

פרויקט Vercel **נפרד** מ-`server/` (אפליקציה עצמאית):

1. New Project → Import מ-GitHub → `eladsrdp/elads`.
2. **Root Directory:** `hachamama-parenting-program/mentor-dashboard`.
3. Framework Preset: Next.js (מזוהה אוטומטית).
4. Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (אותם ערכים מ-`.env` המקומי — אלה מיועדים להיות ציבוריים, זה מה ש-`NEXT_PUBLIC_` מסמן).
5. Deploy.

## מגבלות ידועות (בכוונה, ראו design doc)

- אין שיבוץ מנחה↔נרשם — כל מנחה רואה את כל הנרשמים.
- אין יכולת שליחה/פעולה מהדשבורד — read-only בלבד.
- אין מסך תשובות לשאלונים — Plan C (שאלונים) לא נבנה עדיין, אין טבלת `forms`/`form_responses`.
  להוסיף כשיבנה.
- בלי component/E2E tests — רק unit tests ללוגיקה הטהורה (`src/lib/*.test.ts`). כיסוי
  התואם לעומק הבדיקות הקיים ב-`server/`.
```

- [ ] **Step 2: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/README.md
git commit -m "docs(mentor-dashboard): add setup, mentor-creation, and deployment instructions"
```

---

## Task 11: Final review

- [ ] **Step 1: Full typecheck**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Full test suite**

```bash
npx vitest run
```

Expected: all tests pass (program-day.test.ts + mentor-view.test.ts).

- [ ] **Step 3: Full production build**

```bash
npm run build
```

Expected: builds successfully — this catches Server Component / Server Action mistakes that `tsc --noEmit` alone won't (e.g. using a client-only API in a Server Component).

- [ ] **Step 4: Re-read `docs/2026-07-31-design.md` § "דשבורד מנחות (Read-Only)" against what was built**

Confirm each bullet has a corresponding implemented feature: login (✅ Task 7), no mentor↔participant assignment (✅ — list page shows everyone), participant list with today's-click indicator (✅ Task 8), participant detail with message history (✅ Task 9), no send capability (✅ — no write path exists anywhere in this app). Forms section explicitly deferred (see Task 10's README "מגבלות ידועות").

- [ ] **Step 5: Push**

```bash
git push origin main
```
