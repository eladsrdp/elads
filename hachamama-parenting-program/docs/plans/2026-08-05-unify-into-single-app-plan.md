# Unify Everything Into One App/URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the currently-separate `hachamama-parenting-program/server/` (Hono — webhooks, cron jobs, the public video-submit link) into `hachamama-parenting-program/mentor-dashboard/` (Next.js — the human-facing dashboard), so the whole product deploys as **one Vercel project, one URL**. The user explicitly confirmed this is worth changing external URLs for (Make.com, cron-job.org) — "אין בעיה שנחליף URL."

**⚠️ Production stakes:** `server/` currently sends real WhatsApp messages to 14 real participants, on a live schedule, right now. This plan **ports** that exact logic (near-verbatim — same functions, same tests, same behavior) into the new app rather than rewriting it, specifically to minimize the chance of introducing a behavior change. **The cutover itself (pointing Make.com/cron-job.org at the new URL) is explicitly NOT automated by this plan** — it's the last, manual, user-performed step, done only after the new deployment is verified working. Tasks 1-9 build and verify the new code; they do not touch the live system at all.

**Architecture:**
- All "engine" logic (scheduling math, the `AppDB` abstraction, the Make.com client, video storage, the three scheduled jobs) moves into `mentor-dashboard/src/engine/` — framework-agnostic TypeScript, no Next.js or Hono import anywhere in that directory. This is a near-verbatim port of `server/src/{domain,repository,make,storage,jobs}/*` — same code, same tests, just moved.
- The 5 endpoints external services call become Next.js Route Handlers (`app/api/.../route.ts`) — thin wrappers around the engine, translating Hono's `c.req`/`c.json()` into Web-standard `Request`/`NextResponse`.
- `/video-submit` becomes a Next.js page + Server Action (Next.js Server Actions natively accept `FormData` with `File` entries — no separate Route Handler needed for the upload).
- `server/` is **left untouched and undeleted** by this plan — decommissioning it is a manual step for after the cutover is confirmed stable (not part of these tasks).

---

## File Structure

```
hachamama-parenting-program/mentor-dashboard/
  vercel.json                              # NEW — generate-daily on Vercel-native cron
  package.json                             # MODIFY — add zod dependency
  src/
    engine/
      domain/
        scheduling.ts                      # NEW — verbatim port
        scheduling.test.ts                 # NEW — verbatim port
      repository/
        interface.ts                       # NEW — verbatim port
        local-impl.ts                      # NEW — verbatim port
        local-impl.test.ts                 # NEW — verbatim port
        supabase-impl.ts                   # NEW — verbatim port
        supabase-impl.smoke.test.ts        # NEW — verbatim port
        db.ts                              # NEW — verbatim port
      make/
        client.ts                          # NEW — verbatim port
        client.test.ts                     # NEW — verbatim port
      storage/
        video-storage.ts                   # NEW — verbatim port
        video-storage.test.ts              # NEW — verbatim port
      jobs/
        generate-daily.ts                  # NEW — verbatim port
        generate-daily.test.ts             # NEW — verbatim port
        send-triggers.ts                   # NEW — verbatim port
        send-triggers.test.ts              # NEW — verbatim port
        drip.ts                            # NEW — verbatim port
        drip.test.ts                       # NEW — verbatim port
      env.ts                               # NEW — server-only secrets (not NEXT_PUBLIC_)
      app-context.ts                       # NEW — singleton db/makeClient/videoStorage
    app/
      api/
        webhooks/
          signup/route.ts                  # NEW
          make/button-click/route.ts       # NEW
        cron/
          generate-daily/route.ts          # NEW
          send-triggers/route.ts           # NEW
          drip/route.ts                    # NEW
      video-submit/
        page.tsx                           # NEW — replaces server's HTML form
        actions.ts                         # NEW — Server Action replacing the POST handler
```

---

## Task 1: Engine — domain + repository (interface, local-impl) + `db.ts`

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/domain/scheduling.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/domain/scheduling.test.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/repository/interface.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/repository/local-impl.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/repository/local-impl.test.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/repository/db.ts`

- [ ] **Step 1: Copy `scheduling.ts` verbatim**

```ts
// hachamama-parenting-program/mentor-dashboard/src/engine/domain/scheduling.ts
// לוגיקת תזמון טהורה — יום 1 של כל נרשם, "איזה יום בתוכנית הוא היום", והמרות אזור-זמן ישראל.
// כל חישוב "מהו התאריך היום" נעשה לפי Asia/Jerusalem, לא UTC — כי הריצות היומיות
// ותאריך ההרשמה נמדדים לפי הזמן המקומי של המשתמשים, לא לפי שרת ה-UTC.
//
// הועבר כמעט-מילה-במילה מ-hachamama-parenting-program/server/src/domain/scheduling.ts
// (Plan D/B נתקלו בצורך לכפל 2 מ-3 הפונקציות האלה ב-mentor-dashboard/src/lib/program-day.ts —
// עכשיו שהאפליקציה הזו מכילה גם את המנוע המלא, זה המקור היחיד; program-day.ts יכול
// לייבא מכאן במקום לשמור עותק נפרד — לא חלק מהתוכנית הזו, ראו Notes).
import { DateTime } from 'luxon'

const ISRAEL_ZONE = 'Asia/Jerusalem'

/** התאריך המקומי בישראל של רגע נתון, כ-YYYY-MM-DD. */
export function getIsraelDateString(instant: Date): string {
  return DateTime.fromJSDate(instant).setZone(ISRAEL_ZONE).toISODate() as string
}

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

/** ממיר תאריך (YYYY-MM-DD) + שעה (HH:MM), שניהם בזמן המקומי בישראל, לרגע UTC מדויק. */
export function combineDateAndTimeInIsrael(calendarDate: string, hhmm: string): Date {
  const [year, month, day] = calendarDate.split('-').map(Number)
  const [hour, minute] = hhmm.split(':').map(Number)
  const dt = DateTime.fromObject({ year, month, day, hour, minute }, { zone: ISRAEL_ZONE })
  return dt.toJSDate()
}

/** באיזה "יום בתוכנית" (1-based) הנרשם נמצא, בהינתן day1_date שלו והתאריך הנוכחי. */
export function calculateProgramDayNumber(day1Date: string, todayDate: string): number {
  const d1 = DateTime.fromISO(day1Date, { zone: 'utc' })
  const today = DateTime.fromISO(todayDate, { zone: 'utc' })
  const diffDays = today.diff(d1, 'days').days
  return Math.round(diffDays) + 1
}
```

- [ ] **Step 2: Copy `scheduling.test.ts`**

Read the existing test file at `hachamama-parenting-program/server/src/domain/scheduling.test.ts` and copy it verbatim to `hachamama-parenting-program/mentor-dashboard/src/engine/domain/scheduling.test.ts` — only the relative import path stays the same (`./scheduling.js` or `./scheduling` depending on the original's style; match whatever the original file uses exactly).

- [ ] **Step 3: Run it**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx vitest run src/engine/domain/scheduling.test.ts
```

Expected: PASS, same test count as `server/src/domain/scheduling.test.ts`.

- [ ] **Step 4: Copy `interface.ts` verbatim**

Read `hachamama-parenting-program/server/src/repository/interface.ts` in full and copy it verbatim to `hachamama-parenting-program/mentor-dashboard/src/engine/repository/interface.ts` — no changes, not even comments.

- [ ] **Step 5: Copy `local-impl.ts` verbatim**

Read `hachamama-parenting-program/server/src/repository/local-impl.ts` in full and copy it verbatim to `hachamama-parenting-program/mentor-dashboard/src/engine/repository/local-impl.ts`. Only adjust the relative import path for `interface.js`/`interface` to match wherever it now resolves within the new `engine/repository/` directory (it's a sibling file, so the import statement itself is unchanged — same directory, same relative path).

- [ ] **Step 6: Copy `local-impl.test.ts` verbatim**

Same as Step 5 — copy `hachamama-parenting-program/server/src/repository/local-impl.test.ts` verbatim to the new location.

- [ ] **Step 7: Run it**

```bash
npx vitest run src/engine/repository/local-impl.test.ts
```

Expected: PASS, same test count as the original.

- [ ] **Step 8: Copy `db.ts` verbatim**

Copy `hachamama-parenting-program/server/src/repository/db.ts` verbatim to `hachamama-parenting-program/mentor-dashboard/src/engine/repository/db.ts`.

- [ ] **Step 9: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors from anything under `src/engine/` (there will likely be a pre-existing unrelated error or none at all — report exactly what you see).

- [ ] **Step 10: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/engine/domain hachamama-parenting-program/mentor-dashboard/src/engine/repository/interface.ts hachamama-parenting-program/mentor-dashboard/src/engine/repository/local-impl.ts hachamama-parenting-program/mentor-dashboard/src/engine/repository/local-impl.test.ts hachamama-parenting-program/mentor-dashboard/src/engine/repository/db.ts
git commit -m "feat(mentor-dashboard): port scheduling domain + local AppDB into engine/"
```

## Notes for the implementer

The plan does **not** ask you to update `src/lib/program-day.ts` (the small duplicate this app already had for Plan D/B) to import from the new `engine/domain/scheduling.ts` — leave `program-day.ts` exactly as it is. Consolidating that duplication is a reasonable future cleanup but is out of scope here (don't do it — changing already-working, already-tested UI-facing code is exactly the kind of unrelated change this plan is trying to avoid while merging something this sensitive).

---

## Task 2: Engine — Supabase repository impl + Make client + video storage

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/repository/supabase-impl.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/repository/supabase-impl.smoke.test.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/make/client.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/make/client.test.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/storage/video-storage.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/storage/video-storage.test.ts`

- [ ] **Step 1: Copy all 6 files verbatim**

For each pair below: read the file at the `server/` path in full, then create an identical copy at the `mentor-dashboard/` path (same content, same relative-import structure — each pair lives in the same directory shape, so no import path changes are needed):

- `hachamama-parenting-program/server/src/repository/supabase-impl.ts` → `hachamama-parenting-program/mentor-dashboard/src/engine/repository/supabase-impl.ts`
- `hachamama-parenting-program/server/src/repository/supabase-impl.smoke.test.ts` → `hachamama-parenting-program/mentor-dashboard/src/engine/repository/supabase-impl.smoke.test.ts`
- `hachamama-parenting-program/server/src/make/client.ts` → `hachamama-parenting-program/mentor-dashboard/src/engine/make/client.ts`
- `hachamama-parenting-program/server/src/make/client.test.ts` → `hachamama-parenting-program/mentor-dashboard/src/engine/make/client.test.ts`
- `hachamama-parenting-program/server/src/storage/video-storage.ts` → `hachamama-parenting-program/mentor-dashboard/src/engine/storage/video-storage.ts`
- `hachamama-parenting-program/server/src/storage/video-storage.test.ts` → `hachamama-parenting-program/mentor-dashboard/src/engine/storage/video-storage.test.ts`

- [ ] **Step 2: Run the tests**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx vitest run src/engine/repository/supabase-impl.smoke.test.ts src/engine/make/client.test.ts src/engine/storage/video-storage.test.ts
```

Expected: the smoke test skips (no real Supabase env configured in this worktree — same as it does in `server/`, that's expected and fine), `client.test.ts` and `video-storage.test.ts` pass in full.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/engine/repository/supabase-impl.ts hachamama-parenting-program/mentor-dashboard/src/engine/repository/supabase-impl.smoke.test.ts hachamama-parenting-program/mentor-dashboard/src/engine/make hachamama-parenting-program/mentor-dashboard/src/engine/storage
git commit -m "feat(mentor-dashboard): port Supabase AppDB impl, Make client, video storage into engine/"
```

---

## Task 3: Engine — the three scheduled jobs

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/jobs/generate-daily.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/jobs/generate-daily.test.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/jobs/send-triggers.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/jobs/send-triggers.test.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/jobs/drip.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/jobs/drip.test.ts`

- [ ] **Step 1: Copy all 6 files verbatim**

Same process as Task 2 — read each file from `hachamama-parenting-program/server/src/jobs/*.ts` (and its `.test.ts`) and create an identical copy under `hachamama-parenting-program/mentor-dashboard/src/engine/jobs/`.

- [ ] **Step 2: Run the tests**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx vitest run src/engine/jobs
```

Expected: PASS, same total test count as `server/src/jobs/*.test.ts` combined.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/engine/jobs
git commit -m "feat(mentor-dashboard): port generate-daily, send-triggers, drip jobs into engine/"
```

---

## Task 4: Engine env + app context (singleton wiring)

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/env.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/engine/app-context.ts`
- Modify: `hachamama-parenting-program/mentor-dashboard/package.json`

- [ ] **Step 1: Add `zod` as a dependency**

In `package.json`'s `"dependencies"` block, add (matching the version already used in `server/package.json`):

```json
    "zod": "^3.25.0",
```

- [ ] **Step 2: Write `src/engine/env.ts`**

```ts
// hachamama-parenting-program/mentor-dashboard/src/engine/env.ts
// קונפיגורציית סביבה של המנוע — כל אלה secrets/service-role, בכוונה בלי תחילית
// NEXT_PUBLIC_, כדי שלעולם לא יגיעו ל-bundle של הדפדפן. נקרא רק מ-Route Handlers/
// Server Actions (קוד server-only ב-Next.js) — לעולם לא מקובץ 'use client'.
// הועבר כמעט-מילה-במילה מ-hachamama-parenting-program/server/src/env.ts, בלי
// PORT (Next.js מנהל את זה בעצמו, לא רלוונטי כאן) ובלי 'dotenv/config' (Next.js
// טוען .env.local באופן מובנה, לא צריך את זה).
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  MAKE_WEBHOOK_URL: z.string().optional(),
  SIGNUP_WEBHOOK_SECRET: z.string().default('dev-secret-change-me'),
  MAKE_WEBHOOK_SECRET: z.string().default('dev-secret-change-me'),
  CRON_SECRET: z.string().default('dev-secret-change-me'),
  PROGRAM_LENGTH_DAYS: z.coerce.number().default(64 * 7),
})

export type EngineEnv = z.infer<typeof schema>

export const engineEnv: EngineEnv = schema.parse(process.env)
export const isProd = engineEnv.NODE_ENV === 'production'

// SECURITY: בלי הבדיקה הזו אפשר לפרוס לפרודקשן עם secrets ברירת-מחדל ידועים מראש.
const insecureDefaults = [engineEnv.SIGNUP_WEBHOOK_SECRET, engineEnv.MAKE_WEBHOOK_SECRET, engineEnv.CRON_SECRET]
if (isProd && insecureDefaults.includes('dev-secret-change-me')) {
  throw new Error(
    'SIGNUP_WEBHOOK_SECRET / MAKE_WEBHOOK_SECRET / CRON_SECRET חייבים ערך אקראי ייעודי בפרודקשן',
  )
}
```

- [ ] **Step 3: Write `src/engine/app-context.ts`**

```ts
// hachamama-parenting-program/mentor-dashboard/src/engine/app-context.ts
// חיווט יחיד, טעון פעם אחת, ל-db/makeClient/videoStorage שה-Route Handlers/Server
// Actions משתמשים בהם — מקביל למה ש-server/api/index.ts עשה בעצמו קודם.
import { createDb } from './repository/db.js'
import { createMakeClient } from './make/client.js'
import { createSupabaseVideoStorage, createFakeVideoStorage, type VideoStorage } from './storage/video-storage.js'
import { engineEnv } from './env.js'
import type { AppDB } from './repository/interface.js'
import type { MakeClient } from './make/client.js'

let dbPromise: Promise<AppDB> | null = null
export function getDb(): Promise<AppDB> {
  if (!dbPromise) dbPromise = createDb(engineEnv.SUPABASE_URL, engineEnv.SUPABASE_SERVICE_KEY)
  return dbPromise
}

let makeClientInstance: MakeClient | null = null
export function getMakeClient(): MakeClient {
  if (!makeClientInstance) makeClientInstance = createMakeClient(engineEnv.MAKE_WEBHOOK_URL ?? '')
  return makeClientInstance
}

let videoStorageInstance: VideoStorage | null = null
export function getVideoStorage(): VideoStorage {
  if (!videoStorageInstance) {
    videoStorageInstance =
      engineEnv.SUPABASE_URL && engineEnv.SUPABASE_SERVICE_KEY
        ? createSupabaseVideoStorage(engineEnv.SUPABASE_URL, engineEnv.SUPABASE_SERVICE_KEY)
        : createFakeVideoStorage()
  }
  return videoStorageInstance
}
```

(Lazy singletons, not eager top-level `await` like `server/api/index.ts` used — Next.js Route Handler modules are evaluated per-request in some runtimes, so a top-level `await createDb(...)` is riskier here; lazy getters called from inside each handler are the safer, idiomatic Next.js pattern.)

- [ ] **Step 4: Typecheck**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/engine/env.ts hachamama-parenting-program/mentor-dashboard/src/engine/app-context.ts hachamama-parenting-program/mentor-dashboard/package.json
git commit -m "feat(mentor-dashboard): add engine env config and singleton app-context wiring"
```

---

## Task 5: Webhook Route Handlers (signup, button-click)

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/api/webhooks/signup/route.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/api/webhooks/signup/route.test.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/api/webhooks/make/button-click/route.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/api/webhooks/make/button-click/route.test.ts`

Read `hachamama-parenting-program/server/src/routes/webhooks.ts` and `webhooks.test.ts` in full first — you're translating that exact logic (same zod schemas, same idempotency check, same phone-digit comparison for button-click) from Hono's `app.post('/signup', async (c) => {...})` style into Next.js Route Handler style. The business logic doesn't change at all — only the request/response plumbing does.

- [ ] **Step 1: Write `src/app/api/webhooks/signup/route.ts`**

```ts
// hachamama-parenting-program/mentor-dashboard/src/app/api/webhooks/signup/route.ts
// Webhook הרשמה — מוזרם מהמערכת החיצונית שמנהלת את ההרשמה לקורס.
// SECURITY: חשוף לאינטרנט, מוגן בסוד משותף ב-Authorization header, לא רק CORS/רשת.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { calculateDay1Date } from '@/engine/domain/scheduling'
import { getDb } from '@/engine/app-context'
import { engineEnv } from '@/engine/env'

const SignupSchema = z.object({
  fullName: z.string().min(1).max(200),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'טלפון חייב להיות בפורמט E.164, למשל +972501234567'),
  signupSourceRef: z.string().max(200).optional(),
})

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${engineEnv.SIGNUP_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  const parsed = SignupSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 })
  }

  const db = await getDb()

  const existing = await db.findParticipantByPhone(parsed.data.phone)
  if (existing) {
    return NextResponse.json({ participantId: existing.id, day1Date: existing.day1_date })
  }

  const signupAt = new Date().toISOString()
  const day1Date = calculateDay1Date(new Date(signupAt))

  const participant = await db.createParticipant({
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    signupSourceRef: parsed.data.signupSourceRef ?? null,
    signupAt,
    day1Date,
  })

  return NextResponse.json({ participantId: participant.id, day1Date: participant.day1_date }, { status: 201 })
}
```

- [ ] **Step 2: Write `route.test.ts`** for it

```ts
// hachamama-parenting-program/mentor-dashboard/src/app/api/webhooks/signup/route.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/engine/app-context', () => ({
  getDb: vi.fn(),
}))
vi.mock('@/engine/env', () => ({
  engineEnv: { SIGNUP_WEBHOOK_SECRET: 'test-secret' },
}))

import { getDb } from '@/engine/app-context'
import { POST } from './route'

function makeRequest(body: unknown, authHeader?: string): Request {
  return new Request('http://localhost/api/webhooks/signup', {
    method: 'POST',
    headers: authHeader ? { authorization: authHeader } : {},
    body: JSON.stringify(body),
  })
}

describe('POST /api/webhooks/signup', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockReset()
  })

  it('דוחה בלי Authorization תקין', async () => {
    const res = await POST(makeRequest({ fullName: 'א', phone: '+972501234567' }, 'Bearer wrong'))
    expect(res.status).toBe(401)
  })

  it('יוצר נרשם חדש ומחזיר day1Date', async () => {
    const created = { id: 'p1', day1_date: '2026-08-09' }
    vi.mocked(getDb).mockResolvedValue({
      findParticipantByPhone: async () => undefined,
      createParticipant: async () => created,
    } as never)

    const res = await POST(
      makeRequest({ fullName: 'ישראל ישראלי', phone: '+972501234567' }, 'Bearer test-secret'),
    )

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ participantId: 'p1', day1Date: '2026-08-09' })
  })

  it('נרשם קיים (idempotent) מחזיר 200 בלי ליצור כפילות', async () => {
    const existing = { id: 'p1', day1_date: '2026-08-09' }
    const createParticipant = vi.fn()
    vi.mocked(getDb).mockResolvedValue({
      findParticipantByPhone: async () => existing,
      createParticipant,
    } as never)

    const res = await POST(
      makeRequest({ fullName: 'ישראל ישראלי', phone: '+972501234567' }, 'Bearer test-secret'),
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ participantId: 'p1', day1Date: '2026-08-09' })
    expect(createParticipant).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Write `src/app/api/webhooks/make/button-click/route.ts`**

```ts
// hachamama-parenting-program/mentor-dashboard/src/app/api/webhooks/make/button-click/route.ts
// Make.com מעביר לחיצת כפתור בוקר לכאן. ראו design doc "עקרון מרכזי" — לחיצה
// משחררת רק את היום הספציפי הזה, לא כל pending שהצטבר.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/engine/app-context'
import { engineEnv } from '@/engine/env'

const ButtonClickSchema = z.object({
  phone: z.string().min(1),
  buttonPayload: z.string().min(1),
})

function phoneDigitsOnly(phone: string): string {
  return phone.replace(/\D/g, '')
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${engineEnv.MAKE_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  const parsed = ButtonClickSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 })
  }

  const db = await getDb()

  const trigger = await db.getDailyTrigger(parsed.data.buttonPayload)
  if (!trigger) return NextResponse.json({ error: 'trigger לא נמצא' }, { status: 404 })

  const participant = await db.getParticipant(trigger.participant_id)
  if (!participant || phoneDigitsOnly(participant.phone) !== phoneDigitsOnly(parsed.data.phone)) {
    return NextResponse.json({ error: 'אימות נרשם נכשל' }, { status: 403 })
  }

  const now = new Date().toISOString()
  if (!trigger.clicked_at) {
    await db.markDailyTriggerClicked(trigger.id, now)
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  await db.openOrExtendSessionWindow(participant.id, expiresAt)

  const dueDeliveries = await db.getPendingDeliveriesForTrigger(trigger.id, now)
  const messages = []
  for (const delivery of dueDeliveries) {
    const message = await db.getMessage(delivery.message_id)
    messages.push({
      bodyText: message?.body_text ?? '',
      mediaUrl: message?.media_url ?? null,
      mediaType: message?.media_type ?? null,
    })
    await db.markDeliverySent(delivery.id, now)
  }

  return NextResponse.json({ messages })
}
```

- [ ] **Step 4: Write `route.test.ts`** for it, covering (at minimum, following the exact scenarios already covered in `server/src/routes/webhooks.test.ts`'s button-click describe block): missing auth → 401, unknown trigger → 404, phone mismatch → 403 (including the digits-only normalization case, e.g. `wa_id` without `+` matching a stored `+972...` number), and the happy path returning pending messages and marking them sent. Read `server/src/routes/webhooks.test.ts` for the exact fixture shapes to mirror, and use the same `vi.mock` pattern from Step 2 above (mock `@/engine/app-context` and `@/engine/env`).

- [ ] **Step 5: Run the tests**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx vitest run src/app/api/webhooks
```

- [ ] **Step 6: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/api/webhooks
git commit -m "feat(mentor-dashboard): add signup and button-click webhook route handlers"
```

---

## Task 6: Cron Route Handlers (generate-daily, send-triggers, drip)

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/api/cron/generate-daily/route.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/api/cron/send-triggers/route.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/api/cron/drip/route.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/api/cron/route.test.ts`

Read `hachamama-parenting-program/server/src/routes/cron.ts` and `cron.test.ts` first. Each of the 3 endpoints needs to respond to **both GET and POST** (Vercel Cron always calls GET; cron-job.org can be configured for either) — export both `GET` and `POST` from each `route.ts`, both delegating to the same handler function.

- [ ] **Step 1: Write `src/app/api/cron/generate-daily/route.ts`**

```ts
// hachamama-parenting-program/mentor-dashboard/src/app/api/cron/generate-daily/route.ts
import { NextResponse } from 'next/server'
import { getIsraelDateString } from '@/engine/domain/scheduling'
import { generateDailyDeliveries } from '@/engine/jobs/generate-daily'
import { getDb } from '@/engine/app-context'
import { engineEnv } from '@/engine/env'

async function handle(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${engineEnv.CRON_SECRET}`) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }
  const db = await getDb()
  const result = await generateDailyDeliveries(db, getIsraelDateString(new Date()), engineEnv.PROGRAM_LENGTH_DAYS)
  return NextResponse.json(result)
}

export const GET = handle
export const POST = handle
```

- [ ] **Step 2: Write `src/app/api/cron/send-triggers/route.ts`**

```ts
// hachamama-parenting-program/mentor-dashboard/src/app/api/cron/send-triggers/route.ts
import { NextResponse } from 'next/server'
import { getIsraelDateString } from '@/engine/domain/scheduling'
import { sendMorningTriggers } from '@/engine/jobs/send-triggers'
import { getDb, getMakeClient } from '@/engine/app-context'
import { engineEnv } from '@/engine/env'

async function handle(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${engineEnv.CRON_SECRET}`) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }
  const db = await getDb()
  const result = await sendMorningTriggers(db, getMakeClient(), getIsraelDateString(new Date()))
  return NextResponse.json(result)
}

export const GET = handle
export const POST = handle
```

- [ ] **Step 3: Write `src/app/api/cron/drip/route.ts`**

```ts
// hachamama-parenting-program/mentor-dashboard/src/app/api/cron/drip/route.ts
import { NextResponse } from 'next/server'
import { runDrip } from '@/engine/jobs/drip'
import { getDb, getMakeClient } from '@/engine/app-context'
import { engineEnv } from '@/engine/env'

async function handle(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${engineEnv.CRON_SECRET}`) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }
  const db = await getDb()
  const result = await runDrip(db, getMakeClient(), new Date().toISOString())
  return NextResponse.json(result)
}

export const GET = handle
export const POST = handle
```

- [ ] **Step 4: Write `src/app/api/cron/route.test.ts`**

Cover, for each of the 3 endpoints: both GET and POST reject without a valid `Authorization` header (401), and POST with a valid header returns 200 with a well-formed empty-state result (mirroring `server/src/routes/cron.test.ts`'s assertions, e.g. `{"triggersCreated":0,"deliveriesCreated":0,"participantsCompleted":0,"errors":[]}` for generate-daily). Mock `@/engine/app-context` and `@/engine/env` the same way as Task 5, and mock the three job functions (`@/engine/jobs/generate-daily`, `@/engine/jobs/send-triggers`, `@/engine/jobs/drip`) to return canned results rather than exercising the real job logic — that logic already has its own dedicated tests from Task 3; this test file only needs to prove the routing/auth plumbing is correct.

- [ ] **Step 5: Run the tests**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx vitest run src/app/api/cron
```

- [ ] **Step 6: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/api/cron
git commit -m "feat(mentor-dashboard): add cron route handlers for generate-daily, send-triggers, drip"
```

---

## Task 7: `/video-submit` page + Server Action

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/video-submit/page.tsx`
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/video-submit/actions.ts`

Read `hachamama-parenting-program/server/src/routes/video-submission.ts` first — including its current styling (colors, logo) from the branding work already done. Port the same validation limits (`MAX_VIDEO_SIZE_BYTES`, `ALLOWED_VIDEO_TYPES`), the same `significantPhoneDigits` matching logic, and the same visual styling/logo/palette.

- [ ] **Step 1: Write `src/app/video-submit/actions.ts`**

```ts
// hachamama-parenting-program/mentor-dashboard/src/app/video-submit/actions.ts
'use server'

import { getDb, getVideoStorage } from '@/engine/app-context'

const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm'])

function significantPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '').slice(-9)
}

export type SubmitVideoResult = { ok: true } | { ok: false; error: string }

export async function submitVideo(formData: FormData): Promise<SubmitVideoResult> {
  const phone = formData.get('phone')
  const video = formData.get('video')

  if (typeof phone !== 'string' || !phone) {
    return { ok: false, error: 'יש להזין מספר טלפון' }
  }
  if (!(video instanceof File)) {
    return { ok: false, error: 'יש לבחור קובץ סרטון' }
  }
  if (!ALLOWED_VIDEO_TYPES.has(video.type)) {
    return { ok: false, error: 'סוג הקובץ אינו נתמך — יש להעלות סרטון (mp4/mov/webm)' }
  }
  if (video.size > MAX_VIDEO_SIZE_BYTES) {
    return { ok: false, error: `הקובץ גדול מ-${MAX_VIDEO_SIZE_BYTES / (1024 * 1024)}MB` }
  }

  const db = await getDb()
  const participants = await db.getActiveParticipants()
  const participant = participants.find((p) => significantPhoneDigits(p.phone) === significantPhoneDigits(phone))
  if (!participant) {
    return { ok: false, error: 'מספר הטלפון לא נמצא — בדוק/י שהוקלד נכון' }
  }

  const bytes = new Uint8Array(await video.arrayBuffer())
  const videoUrl = await getVideoStorage().upload(bytes, video.name, video.type)
  await db.createVideoSubmission({ participantId: participant.id, videoUrl })

  return { ok: true }
}
```

- [ ] **Step 2: Write `src/app/video-submit/page.tsx`**

Read the current styled HTML in `hachamama-parenting-program/server/src/routes/video-submission.ts` (the `FORM_PAGE_HTML` template string, including the color constants and logo URL near the top of that file) and translate it into JSX with the same visual result — same colors, same logo image, same layout, same Hebrew copy. Structure:

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/video-submit/page.tsx
'use client'

import { useState } from 'react'
import { submitVideo } from './actions'

// (copy the exact COLOR_* constants and LOGO_URL from server/src/routes/video-submission.ts here)

export default function VideoSubmitPage() {
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setSubmitting(true)
    const outcome = await submitVideo(formData)
    setResult(outcome.ok ? { ok: true } : { ok: false, error: outcome.error })
    setSubmitting(false)
  }

  if (result?.ok) {
    return (
      // success state — same visual card as before, "התקבל! הסרטון הועלה בהצלחה."
    )
  }

  return (
    <main /* same body/card styles as the ported COLOR_* constants */>
      {/* logo image, h1 "העלאת סרטון", tagline */}
      <form action={handleSubmit}>
        <label>
          מספר טלפון
          <input type="tel" name="phone" required />
        </label>
        <label>
          קובץ סרטון
          <input type="file" name="video" accept="video/*" required />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'שולח...' : 'שלח'}
        </button>
      </form>
      {result && !result.ok && <p style={{ color: 'red' }}>{result.error}</p>}
    </main>
  )
}
```

Fill in the actual JSX/styling by directly porting the real color values and markup structure from the existing `video-submission.ts` HTML template — don't invent new styling, copy what's already there and already approved.

- [ ] **Step 3: Typecheck + build**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx tsc --noEmit
NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co" NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder" npm run build
```

- [ ] **Step 4: Manual verification checklist** (deferred to Task 9's final review — note in your report that this is deferred, don't attempt it now)

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/video-submit
git commit -m "feat(mentor-dashboard): add /video-submit page and server action"
```

---

## Task 8: `vercel.json` + README for the unified app

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/vercel.json`
- Modify: `hachamama-parenting-program/mentor-dashboard/README.md`

- [ ] **Step 1: Write `vercel.json`**

```json
{
  "crons": [
    { "path": "/api/cron/generate-daily", "schedule": "5 21 * * *" }
  ]
}
```

(Only `generate-daily` — matches the existing decision in `server/vercel.json` that `send-triggers` needed precise timing and stays on cron-job.org, and `drip` runs too frequently for Vercel Hobby's once-a-day cron limit. See `server/README.md` for the full reasoning — same reasoning applies here unchanged.)

- [ ] **Step 2: Add a new top section to `README.md`**, right after the title, before the existing content:

```markdown
## ⚠️ זו האפליקציה המאוחדת (2026-08-05)

`hachamama-parenting-program/server/` (הישן) ו-`mentor-dashboard/` (הזו) מוזגו לאפליקציה
אחת — הכל (webhooks, cron jobs, לינק הסרטון הציבורי, דשבורד המנחות) רץ כאן, ב-Vercel
project אחד. `server/` נשאר בריפו בלי להימחק (בכוונה, לצורך השוואה/rollback), אבל
**אחרי שהמעבר יאושר בפועל הוא לא צריך להיפרס יותר**. ראו `docs/plans/2026-08-05-unify-into-single-app-plan.md`
לתוכנית המלאה ולצ'קליסט המעבר (עדכון URLs ב-Make.com וב-cron-job.org).

## Endpoints (מאוחד)

| Method | Path | הגנה | תפקיד |
|---|---|---|---|
| POST | `/api/webhooks/signup` | `Authorization: Bearer $SIGNUP_WEBHOOK_SECRET` | יוצר נרשם חדש |
| POST | `/api/webhooks/make/button-click` | `Authorization: Bearer $MAKE_WEBHOOK_SECRET` | Make מעביר לחיצת כפתור |
| GET/POST | `/api/cron/generate-daily` | `Authorization: Bearer $CRON_SECRET` | ריצה יומית — Vercel Cron מובנה, 00:05 |
| GET/POST | `/api/cron/send-triggers` | `Authorization: Bearer $CRON_SECRET` | טריגר בוקר — cron-job.org, 06:45 מדויק |
| GET/POST | `/api/cron/drip` | `Authorization: Bearer $CRON_SECRET` | שליחה בזמן אמת — cron-job.org, כל 5 דקות |
| GET/POST | `/video-submit` | — (ציבורי) | לינק להעלאת סרטון ע"י נרשם |
| — | `/participants`, `/content` | Supabase Auth (מנחה) | הדשבורד |

## Env vars נוספים (חדש — לא היו כאן קודם, הגיעו מ-server/)

בנוסף ל-`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` הקיימים, האפליקציה
המאוחדת צריכה גם (כולם **בלי** `NEXT_PUBLIC_` — סודות server-only):

- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — אותו פרויקט Supabase, מפתח service role.
- `MAKE_WEBHOOK_URL` — ה-webhook URL של Make.com (לא משתנה, זה ה-URL של Make עצמו).
- `SIGNUP_WEBHOOK_SECRET`, `MAKE_WEBHOOK_SECRET`, `CRON_SECRET` — אפשר להשתמש באותם
  ערכים שהיו מוגדרים ב-Vercel project הישן, כדי לא לצטרך לעדכן secrets בצד Make/cron-job.org —
  רק את ה-URL (host) צריך לעדכן שם, לא את הטוקנים.
- `PROGRAM_LENGTH_DAYS` — `448` (64 שבועות), כמו קודם.
```

- [ ] **Step 3: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/vercel.json hachamama-parenting-program/mentor-dashboard/README.md
git commit -m "docs(mentor-dashboard): document the unified app's endpoints and required env vars"
```

---

## Task 9: Final review — full verification, then the manual cutover checklist

**Do NOT perform any of the external steps below yourself** (no access to Make.com/cron-job.org/Vercel login) — this task ends with a checklist for the user, not automated actions.

- [ ] **Step 1: Full local verification**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx vitest run
npx tsc --noEmit
NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co" NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder" npm run build
```

Expected: every test across `src/engine/**`, `src/app/api/**`, and the pre-existing `src/lib/**` passes; typecheck clean; build succeeds including the new `/api/webhooks/*`, `/api/cron/*`, and `/video-submit` routes appearing in the build output's route table.

- [ ] **Step 2: Re-read the plan's Architecture section against what was built**

Confirm: engine code is a verbatim port (✅ Tasks 1-3), no Hono/hono import survives anywhere under `src/engine/` or `src/app/api/` (grep for `from 'hono'` under `mentor-dashboard/src` — expect zero matches), `server/` was not modified or deleted (✅ by construction — no task touched it).

- [ ] **Step 3: Merge to `main`, push** — same flow used for every other plan this session (merge the worktree branch, verify tests on the merged result, push, clean up the worktree).

- [ ] **Step 4: Report the manual cutover checklist to the user, in full, in Hebrew**

This is the actual deliverable of this task — write out clearly, for the user to follow at their own pace, **after** confirming the merge is live on Vercel and manually verified working:

1. **Vercel project** — this IS the one project now (Root Directory `hachamama-parenting-program/mentor-dashboard`). If it doesn't exist yet, create it (per the existing README steps) and add the new env vars from Task 8's README section, in addition to the two `NEXT_PUBLIC_` ones already documented.
2. **Verify manually before touching anything external:** hit `/api/webhooks/signup` and `/api/cron/generate-daily` etc. with `curl` + the real `CRON_SECRET`/`SIGNUP_WEBHOOK_SECRET` against the new deployed URL, confirm responses match what `server/`'s deployed version currently returns.
3. **Update Make.com's scenario:** the module that calls INTO our system on button-click needs its target URL changed from the old domain's `/api/webhooks/make/button-click` to the new domain's same path. (`MAKE_WEBHOOK_URL` — the URL WE call OUT to Make — does not change.)
4. **Update cron-job.org's job(s):** `send-triggers` and `drip` job URLs change to the new domain (same paths, same `CRON_SECRET`).
5. **Update the external registration system** that calls `/api/webhooks/signup` — whatever collects course signups needs its webhook target updated to the new domain too. (Flag this explicitly to the user — this plan has no visibility into what that external system is, only that something external currently calls this endpoint.)
6. **Only after all of the above are confirmed working on the new URL** — pause/delete the old `server/` Vercel project, so there is genuinely only one deployment running.
