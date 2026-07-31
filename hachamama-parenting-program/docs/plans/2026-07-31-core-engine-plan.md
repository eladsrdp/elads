# Core Engine (Plan A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the standalone server that owns participant enrollment, the per-day content scheduling engine, and the Make.com/WhatsApp integration described in `hachamama-parenting-program/docs/2026-07-31-design.md` — with no admin UI, no forms, and no mentor dashboard (those are separate plans B/C/D).

**Architecture:** A Hono HTTP server (mirroring the pattern already used in `priority-lite/server`) exposing webhook endpoints (external signup, Make button-click) and cron-triggered job endpoints (daily generation, morning trigger send, real-time drip), backed by a swappable data layer — an in-memory implementation for fast tests and a Supabase (Postgres) implementation for real deployments, selected by a factory function exactly like `priority-lite/server/src/db/db.ts` does.

**Tech Stack:** TypeScript, Hono + `@hono/node-server`, `@supabase/supabase-js`, `zod` (validation), `luxon` (timezone-aware date math for Asia/Jerusalem), `dotenv`, `tsx` (dev runner), Vitest (tests). Code style matches `priority-lite/server`: no semicolons, single quotes, factory functions (`createX(...)`), Hebrew test descriptions and comments explaining *why*.

---

## Scope note

This is Plan A of a 4-plan breakdown of the full spec (see `hachamama-parenting-program/docs/2026-07-31-design.md`). Plans B (admin content UI), C (forms/questionnaires), D (mentor dashboard) all depend on the data layer and schema built here and are planned separately.

## File Structure

```
hachamama-parenting-program/server/
  package.json
  tsconfig.json
  .env.example
  migrations/
    0001_init.sql
  src/
    env.ts                          # zod-validated env config
    context.ts                      # AppContext (injected dependencies)
    app.ts                          # Hono app assembly
    index.ts                        # real entrypoint (wires real deps, starts server)
    domain/
      scheduling.ts                 # pure date/time functions (day1_date, program day number, Israel tz)
      scheduling.test.ts
    repository/
      interface.ts                  # AppDB interface + Row types
      local-impl.ts                 # in-memory AppDB (tests + local dev)
      local-impl.test.ts
      supabase-impl.ts              # real Postgres/Supabase AppDB
      supabase-impl.smoke.test.ts   # skipped unless SUPABASE_URL/KEY set
      db.ts                         # createDb() factory
    make/
      client.ts                     # MakeClient (real) + createFakeMakeClient (test double)
      client.test.ts
    jobs/
      generate-daily.ts             # JIT daily_triggers + message_deliveries generation
      generate-daily.test.ts
      send-triggers.ts              # morning: call Make for unsent daily_triggers
      send-triggers.test.ts
      drip.ts                       # real-time: send due+clicked+window-open deliveries
      drip.test.ts
    routes/
      webhooks.ts                   # POST /signup, POST /make/button-click
      webhooks.test.ts
      cron.ts                       # POST /generate-daily, /send-triggers, /drip
      cron.test.ts
```

---

### Task 1: Project scaffold

**Files:**
- Create: `hachamama-parenting-program/server/package.json`
- Create: `hachamama-parenting-program/server/tsconfig.json`
- Create: `hachamama-parenting-program/server/.env.example`
- Create: `hachamama-parenting-program/server/src/env.ts`
- Create: `hachamama-parenting-program/server/src/context.ts`
- Create: `hachamama-parenting-program/server/src/app.ts`
- Create: `hachamama-parenting-program/server/src/app.test.ts`
- Create: `hachamama-parenting-program/server/src/index.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@hachamama/server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch --import tsx src/index.ts",
    "start": "tsx src/index.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.7",
    "@supabase/supabase-js": "^2.49.8",
    "dotenv": "^16.4.7",
    "hono": "^4.6.14",
    "luxon": "^3.5.0",
    "tsx": "^4.19.2",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/luxon": "^3.4.2",
    "@types/node": "^24.12.3",
    "typescript": "~6.0.2",
    "vitest": "^4.1.8"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `.env.example`**

```bash
# Copy to .env and fill in the values
# SECURITY: never commit .env — it's git-ignored

PORT=8788
NODE_ENV=development

# Supabase — אם ריק, השרת משתמש ב-in-memory DB (מתאים לפיתוח מקומי בלבד)
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Make.com — ה-custom webhook שהמערכת קוראת לו כדי לשלוח הודעות בפועל
MAKE_WEBHOOK_URL=

# Secrets משותפים — כל אחד צריך ערך אקראי (openssl rand -hex 32) בפרודקשן.
# מגנים על ה-endpoints הציבוריים מפני קריאות לא-מאומתות.
SIGNUP_WEBHOOK_SECRET=dev-secret-change-me
MAKE_WEBHOOK_SECRET=dev-secret-change-me
CRON_SECRET=dev-secret-change-me
```

- [ ] **Step 4: Create `src/env.ts`**

```ts
// קונפיגורציית סביבה — נטענת פעם אחת ומאומתת עם zod.
import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().default(8788),
  NODE_ENV: z.string().default('development'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  MAKE_WEBHOOK_URL: z.string().optional(),
  SIGNUP_WEBHOOK_SECRET: z.string().default('dev-secret-change-me'),
  MAKE_WEBHOOK_SECRET: z.string().default('dev-secret-change-me'),
  CRON_SECRET: z.string().default('dev-secret-change-me'),
})

export type Env = z.infer<typeof schema>

export const env: Env = schema.parse(process.env)
export const isProd = env.NODE_ENV === 'production'

// SECURITY: בלי הבדיקה הזו אפשר לפרוס לפרודקשן עם secrets ברירת-מחדל ידועים מראש.
const insecureDefaults = [env.SIGNUP_WEBHOOK_SECRET, env.MAKE_WEBHOOK_SECRET, env.CRON_SECRET]
if (isProd && insecureDefaults.includes('dev-secret-change-me')) {
  throw new Error(
    'SIGNUP_WEBHOOK_SECRET / MAKE_WEBHOOK_SECRET / CRON_SECRET חייבים ערך אקראי ייעודי בפרודקשן',
  )
}
```

- [ ] **Step 5: Create `src/context.ts`**

```ts
// התלויות של האפליקציה — מוזרקות כדי שבדיקות יוכלו להחליף כל חלק.
import type { AppDB } from './repository/interface'
import type { Env } from './env'
import type { MakeClient } from './make/client'

export interface AppContext {
  db: AppDB
  makeClient: MakeClient
  env: Env
}
```

Note: this file references `./repository/interface` and `./make/client`, which don't exist yet — that's expected, later tasks create them (Task 3 and Task 7 respectively). `tsc --noEmit` would fail until both exist, so this plan only runs `npm run typecheck` once, at the very end (Task 14), after every module is in place.

- [ ] **Step 6: Create `src/app.ts`** (health check only for now — routes are added in later tasks)

```ts
// הרכבת אפליקציית ה-Hono — מופרד מ-index.ts כדי שבדיקות יוכלו להרכיב app עם תלויות מדומות.
import { Hono } from 'hono'
import type { AppContext } from './context'

export function createApp(ctx: AppContext) {
  const app = new Hono()

  app.get('/api/health', (c) => c.json({ ok: true }))

  app.onError((err, c) => {
    // SECURITY: לא חושפים stack trace/פרטי שגיאה פנימיים ללקוח — רק ללוג השרת.
    console.error('[server error]', err)
    return c.json({ error: 'שגיאת שרת' }, 500)
  })

  return app
}
```

- [ ] **Step 7: Create `src/app.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { createApp } from './app'

describe('GET /api/health', () => {
  it('מחזיר ok:true בלי תלויות אמיתיות', async () => {
    // @ts-expect-error — ל-health check אין צורך בתלויות אמיתיות בשלב הזה
    const app = createApp({})
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
```

- [ ] **Step 8: Create `src/index.ts`** (minimal — will be extended in Task 12 once `db`/`makeClient` exist)

```ts
import { serve } from '@hono/node-server'
import { createApp } from './app'
import { env } from './env'

// @ts-expect-error — הרכבה מלאה עם db/makeClient אמיתיים מגיעה במשימה 12
const app = createApp({ env })

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`🚀 Hachamama server — http://localhost:${info.port}`)
})
```

- [ ] **Step 9: Install dependencies and run the test**

```bash
cd hachamama-parenting-program/server
npm install
npm test
```

Expected: 1 test file, 1 test, PASS.

- [ ] **Step 10: Commit**

```bash
git add hachamama-parenting-program/server/package.json hachamama-parenting-program/server/tsconfig.json hachamama-parenting-program/server/.env.example hachamama-parenting-program/server/src/env.ts hachamama-parenting-program/server/src/context.ts hachamama-parenting-program/server/src/app.ts hachamama-parenting-program/server/src/app.test.ts hachamama-parenting-program/server/src/index.ts hachamama-parenting-program/server/package-lock.json
git commit -m "feat(hachamama): scaffold server with health check endpoint"
```

---

### Task 2: Scheduling domain functions (day1_date, program day number, Israel timezone)

**Files:**
- Create: `hachamama-parenting-program/server/src/domain/scheduling.ts`
- Create: `hachamama-parenting-program/server/src/domain/scheduling.test.ts`

This is the most important business logic in the whole system — it decides which Sunday a participant starts on, what "day N" means today, and how to combine a calendar date with a time-of-day in Israel's timezone (handling DST correctly, which is why we use `luxon` instead of hand-rolled offset math).

- [ ] **Step 1: Write the failing tests**

```ts
// hachamama-parenting-program/server/src/domain/scheduling.test.ts
import { describe, expect, it } from 'vitest'
import {
  calculateDay1Date,
  calculateProgramDayNumber,
  combineDateAndTimeInIsrael,
  getIsraelDateString,
} from './scheduling'

// עוגן: 2023-01-01 היה יום ראשון — קל לוודא ידנית שכל שאר התאריכים נכונים.
describe('calculateDay1Date', () => {
  it('נרשם ביום חמישי (2023-01-05) מתחיל בראשון הקרוב (2023-01-08)', () => {
    expect(calculateDay1Date(new Date('2023-01-05T10:00:00Z'))).toBe('2023-01-08')
  })

  it('נרשם ביום ראשון עצמו (2023-01-01) מתחיל בראשון הבא, לא באותו יום (2023-01-08)', () => {
    expect(calculateDay1Date(new Date('2023-01-01T10:00:00Z'))).toBe('2023-01-08')
  })

  it('נרשם בשבת (2023-01-07) מתחיל למחרת (2023-01-08)', () => {
    expect(calculateDay1Date(new Date('2023-01-07T10:00:00Z'))).toBe('2023-01-08')
  })

  it('מחשב לפי התאריך המקומי בישראל, לא UTC — שבת בלילה ב-UTC שהיא כבר ראשון בישראל', () => {
    // 2023-01-07T22:30Z + חורף בישראל (UTC+2, בלי שעון קיץ) = 2023-01-08T00:30 בישראל = יום ראשון
    // לכן היום הבא הוא בעוד שבוע שלם, לא המחר.
    expect(calculateDay1Date(new Date('2023-01-07T22:30:00Z'))).toBe('2023-01-15')
  })
})

describe('getIsraelDateString', () => {
  it('ממיר זמן UTC לתאריך מקומי בישראל (חורף, UTC+2)', () => {
    expect(getIsraelDateString(new Date('2023-01-07T22:30:00Z'))).toBe('2023-01-08')
  })

  it('ממיר זמן UTC לתאריך מקומי בישראל (קיץ, UTC+3, שעון קיץ)', () => {
    expect(getIsraelDateString(new Date('2023-06-15T21:30:00Z'))).toBe('2023-06-16')
  })
})

describe('combineDateAndTimeInIsrael', () => {
  it('ממיר תאריך+שעה בישראל ל-UTC נכון בחורף (UTC+2)', () => {
    const result = combineDateAndTimeInIsrael('2023-01-08', '07:00')
    expect(result.toISOString()).toBe('2023-01-08T05:00:00.000Z')
  })

  it('ממיר תאריך+שעה בישראל ל-UTC נכון בקיץ עם שעון קיץ (UTC+3)', () => {
    const result = combineDateAndTimeInIsrael('2023-06-15', '07:00')
    expect(result.toISOString()).toBe('2023-06-15T04:00:00.000Z')
  })
})

describe('calculateProgramDayNumber', () => {
  it('ביום ה-day1_date עצמו — יום 1', () => {
    expect(calculateProgramDayNumber('2023-01-08', '2023-01-08')).toBe(1)
  })

  it('יום אחרי day1_date — יום 2', () => {
    expect(calculateProgramDayNumber('2023-01-08', '2023-01-09')).toBe(2)
  })

  it('שבוע אחרי day1_date — יום 8', () => {
    expect(calculateProgramDayNumber('2023-01-08', '2023-01-15')).toBe(8)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd hachamama-parenting-program/server
npx vitest run src/domain/scheduling.test.ts
```

Expected: FAIL — `Cannot find module './scheduling'`.

- [ ] **Step 3: Implement `src/domain/scheduling.ts`**

```ts
// לוגיקת תזמון טהורה — יום 1 של כל נרשם, "איזה יום בתוכנית הוא היום", והמרות אזור-זמן ישראל.
// כל חישוב "מהו התאריך היום" נעשה לפי Asia/Jerusalem, לא UTC — כי הריצות היומיות
// ותאריך ההרשמה נמדדים לפי הזמן המקומי של המשתמשים, לא לפי שרת ה-UTC.
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

- [ ] **Step 4: Run to verify it passes**

```bash
cd hachamama-parenting-program/server
npx vitest run src/domain/scheduling.test.ts
```

Expected: PASS — 10 tests.

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/server/src/domain
git commit -m "feat(hachamama): add scheduling domain functions (day1_date, program day, Israel tz)"
```

---

### Task 3: Repository interface + participant methods (in-memory)

**Files:**
- Create: `hachamama-parenting-program/server/src/repository/interface.ts`
- Create: `hachamama-parenting-program/server/src/repository/local-impl.ts`
- Create: `hachamama-parenting-program/server/src/repository/local-impl.test.ts`

- [ ] **Step 1: Create `src/repository/interface.ts`** (full `AppDB` interface — every method the whole engine needs, even though we only implement participants in this task)

```ts
// ממשק אחיד לשכבת ה-DB — מימושים: Local (in-memory, לפיתוח/בדיקות) ו-Supabase (ענן).
// שמות השדות ב-snake_case כדי למפות ישירות לעמודות ה-Postgres.

export type ParticipantStatus = 'active' | 'completed' | 'paused'

export interface ParticipantRow {
  id: string
  full_name: string
  phone: string
  signup_source_ref: string | null
  signup_at: string
  day1_date: string
  status: ParticipantStatus
}

export interface ContentDayRow {
  day_number: number
  title: string | null
}

export type MediaType = 'image' | 'video' | 'audio' | 'document'

export interface MessageRow {
  id: string
  content_day_number: number
  send_offset_time: string
  order_in_day: number
  body_text: string
  media_url: string | null
  media_type: MediaType | null
}

export interface DailyTriggerRow {
  id: string
  participant_id: string
  calendar_date: string
  content_day_number: number
  trigger_sent_at: string | null
  clicked_at: string | null
}

export type DeliveryStatus = 'pending' | 'sent'

export interface MessageDeliveryRow {
  id: string
  participant_id: string
  message_id: string
  daily_trigger_id: string
  scheduled_for: string
  status: DeliveryStatus
  sent_at: string | null
}

export interface SessionWindowRow {
  participant_id: string
  opened_at: string
  expires_at: string
}

export interface AppDB {
  ping(): Promise<void>

  // participants
  createParticipant(input: {
    fullName: string
    phone: string
    signupSourceRef: string | null
    signupAt: string
    day1Date: string
  }): Promise<ParticipantRow>
  getParticipant(id: string): Promise<ParticipantRow | undefined>
  findParticipantByPhone(phone: string): Promise<ParticipantRow | undefined>
  getActiveParticipants(): Promise<ParticipantRow[]>
  markParticipantCompleted(id: string): Promise<void>

  // content
  createContentDay(input: { dayNumber: number; title: string | null }): Promise<ContentDayRow>
  getContentDay(dayNumber: number): Promise<ContentDayRow | undefined>
  getMaxContentDayNumber(): Promise<number>
  createMessage(input: {
    contentDayNumber: number
    sendOffsetTime: string
    orderInDay: number
    bodyText: string
    mediaUrl: string | null
    mediaType: MediaType | null
  }): Promise<MessageRow>
  getMessage(id: string): Promise<MessageRow | undefined>
  getMessagesForContentDay(dayNumber: number): Promise<MessageRow[]>

  // daily triggers
  createDailyTrigger(input: {
    participantId: string
    calendarDate: string
    contentDayNumber: number
  }): Promise<DailyTriggerRow>
  findDailyTrigger(participantId: string, calendarDate: string): Promise<DailyTriggerRow | undefined>
  getDailyTrigger(id: string): Promise<DailyTriggerRow | undefined>
  getUnsentDailyTriggers(calendarDate: string): Promise<DailyTriggerRow[]>
  markDailyTriggerSent(id: string, sentAt: string): Promise<void>
  markDailyTriggerClicked(id: string, clickedAt: string): Promise<void>

  // message deliveries
  createMessageDelivery(input: {
    participantId: string
    messageId: string
    dailyTriggerId: string
    scheduledFor: string
  }): Promise<MessageDeliveryRow>
  getPendingDeliveriesForTrigger(dailyTriggerId: string, upTo: string): Promise<MessageDeliveryRow[]>
  getDuePendingDeliveriesWithClickedTrigger(now: string): Promise<MessageDeliveryRow[]>
  markDeliverySent(id: string, sentAt: string): Promise<void>

  // session windows (אילוץ טכני גלובלי — לא קשור לאיזה יום שוחרר, ראו design doc)
  openOrExtendSessionWindow(participantId: string, expiresAt: string): Promise<void>
  isSessionWindowOpen(participantId: string, now: string): Promise<boolean>
}
```

- [ ] **Step 2: Write the failing test for participant methods**

```ts
// hachamama-parenting-program/server/src/repository/local-impl.test.ts
import { describe, expect, it } from 'vitest'
import { createLocalDb } from './local-impl'

describe('createLocalDb — participants', () => {
  it('יוצר נרשם ומחזיר אותו עם id ו-status active', async () => {
    const db = createLocalDb()
    const p = await db.createParticipant({
      fullName: 'ישראל ישראלי',
      phone: '+972501234567',
      signupSourceRef: 'ext-123',
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    expect(p.id).toBeTruthy()
    expect(p.status).toBe('active')
    expect(p.full_name).toBe('ישראל ישראלי')
  })

  it('getParticipant מחזיר undefined כשלא קיים', async () => {
    const db = createLocalDb()
    expect(await db.getParticipant('missing')).toBeUndefined()
  })

  it('findParticipantByPhone מוצא לפי טלפון', async () => {
    const db = createLocalDb()
    const created = await db.createParticipant({
      fullName: 'שרה כהן',
      phone: '+972521111111',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    const found = await db.findParticipantByPhone('+972521111111')
    expect(found?.id).toBe(created.id)
  })

  it('getActiveParticipants מחזיר רק active, לא completed', async () => {
    const db = createLocalDb()
    const a = await db.createParticipant({
      fullName: 'א',
      phone: '+972500000001',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    await db.createParticipant({
      fullName: 'ב',
      phone: '+972500000002',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    await db.markParticipantCompleted(a.id)

    const active = await db.getActiveParticipants()
    expect(active).toHaveLength(1)
    expect(active[0].full_name).toBe('ב')
  })
})
```

- [ ] **Step 3: Run to verify it fails**

```bash
cd hachamama-parenting-program/server
npx vitest run src/repository/local-impl.test.ts
```

Expected: FAIL — `Cannot find module './local-impl'`.

- [ ] **Step 4: Implement `src/repository/local-impl.ts`** (participants only for now — other sections are `throw` stubs replaced in Tasks 4-5)

```ts
// מימוש Local של AppDB — in-memory, לפיתוח/בדיקות בלי Supabase אמיתי.
import { randomUUID } from 'node:crypto'
import type {
  AppDB,
  ContentDayRow,
  DailyTriggerRow,
  MessageDeliveryRow,
  MessageRow,
  ParticipantRow,
} from './interface'

export function createLocalDb(): AppDB {
  const participants = new Map<string, ParticipantRow>()
  const contentDays = new Map<number, ContentDayRow>()
  const messages = new Map<string, MessageRow>()
  const dailyTriggers = new Map<string, DailyTriggerRow>()
  const messageDeliveries = new Map<string, MessageDeliveryRow>()
  const sessionWindows = new Map<string, { participant_id: string; opened_at: string; expires_at: string }>()

  return {
    async ping() {},

    async createParticipant(input) {
      const row: ParticipantRow = {
        id: randomUUID(),
        full_name: input.fullName,
        phone: input.phone,
        signup_source_ref: input.signupSourceRef,
        signup_at: input.signupAt,
        day1_date: input.day1Date,
        status: 'active',
      }
      participants.set(row.id, row)
      return row
    },

    async getParticipant(id) {
      return participants.get(id)
    },

    async findParticipantByPhone(phone) {
      return [...participants.values()].find((p) => p.phone === phone)
    },

    async getActiveParticipants() {
      return [...participants.values()].filter((p) => p.status === 'active')
    },

    async markParticipantCompleted(id) {
      const row = participants.get(id)
      if (row) participants.set(id, { ...row, status: 'completed' })
    },

    async createContentDay() {
      throw new Error('not implemented yet — Task 4')
    },
    async getContentDay() {
      throw new Error('not implemented yet — Task 4')
    },
    async getMaxContentDayNumber() {
      throw new Error('not implemented yet — Task 4')
    },
    async createMessage() {
      throw new Error('not implemented yet — Task 4')
    },
    async getMessage() {
      throw new Error('not implemented yet — Task 4')
    },
    async getMessagesForContentDay() {
      throw new Error('not implemented yet — Task 4')
    },
    async createDailyTrigger() {
      throw new Error('not implemented yet — Task 4')
    },
    async findDailyTrigger() {
      throw new Error('not implemented yet — Task 4')
    },
    async getDailyTrigger() {
      throw new Error('not implemented yet — Task 4')
    },
    async getUnsentDailyTriggers() {
      throw new Error('not implemented yet — Task 4')
    },
    async markDailyTriggerSent() {
      throw new Error('not implemented yet — Task 4')
    },
    async markDailyTriggerClicked() {
      throw new Error('not implemented yet — Task 4')
    },
    async createMessageDelivery() {
      throw new Error('not implemented yet — Task 4')
    },
    async getPendingDeliveriesForTrigger() {
      throw new Error('not implemented yet — Task 4')
    },
    async getDuePendingDeliveriesWithClickedTrigger() {
      throw new Error('not implemented yet — Task 4')
    },
    async markDeliverySent() {
      throw new Error('not implemented yet — Task 4')
    },
    async openOrExtendSessionWindow() {
      throw new Error('not implemented yet — Task 5')
    },
    async isSessionWindowOpen() {
      throw new Error('not implemented yet — Task 5')
    },
  }
}
```

**Note on `throw` stubs:** these are temporary and every one is replaced with a real implementation in Task 4 or 5 within this same plan — this is not a placeholder left for "later" in the no-placeholders sense, it's a deliberate TDD stepping stone inside one continuous plan. `AppDB` is a plain object literal here (not a class), so TypeScript accepts the stub methods as long as their signatures match the interface.

- [ ] **Step 5: Run to verify it passes**

```bash
cd hachamama-parenting-program/server
npx vitest run src/repository/local-impl.test.ts
```

Expected: PASS — 4 tests.

- [ ] **Step 6: Commit**

```bash
git add hachamama-parenting-program/server/src/repository
git commit -m "feat(hachamama): add AppDB interface and local-impl participant methods"
```

---

### Task 4: Local repository — content, daily triggers, message deliveries

**Files:**
- Modify: `hachamama-parenting-program/server/src/repository/local-impl.ts`
- Modify: `hachamama-parenting-program/server/src/repository/local-impl.test.ts`

- [ ] **Step 1: Add failing tests** (append to `local-impl.test.ts`)

```ts
describe('createLocalDb — content', () => {
  it('שומר ומחזיר content day + הודעות שלו, ממוינות לפי order_in_day', async () => {
    const db = createLocalDb()
    await db.createContentDay({ dayNumber: 1, title: 'יום ראשון בתוכנית' })
    await db.createMessage({
      contentDayNumber: 1,
      sendOffsetTime: '08:00',
      orderInDay: 2,
      bodyText: 'הודעה שנייה',
      mediaUrl: null,
      mediaType: null,
    })
    await db.createMessage({
      contentDayNumber: 1,
      sendOffsetTime: '06:00',
      orderInDay: 1,
      bodyText: 'הודעה ראשונה',
      mediaUrl: null,
      mediaType: null,
    })

    const day = await db.getContentDay(1)
    expect(day?.title).toBe('יום ראשון בתוכנית')

    const msgs = await db.getMessagesForContentDay(1)
    expect(msgs.map((m) => m.body_text)).toEqual(['הודעה ראשונה', 'הודעה שנייה'])
  })

  it('getMaxContentDayNumber מחזיר 0 כשאין תוכן, ואחרת את המקסימום', async () => {
    const db = createLocalDb()
    expect(await db.getMaxContentDayNumber()).toBe(0)
    await db.createContentDay({ dayNumber: 3, title: null })
    await db.createContentDay({ dayNumber: 7, title: null })
    expect(await db.getMaxContentDayNumber()).toBe(7)
  })
})

describe('createLocalDb — daily triggers ומ-message deliveries', () => {
  it('יוצר daily_trigger, מוצא אותו לפי participant+date, ומסמן נשלח/נלחץ', async () => {
    const db = createLocalDb()
    const trigger = await db.createDailyTrigger({
      participantId: 'p1',
      calendarDate: '2023-01-08',
      contentDayNumber: 1,
    })
    expect(trigger.trigger_sent_at).toBeNull()
    expect(trigger.clicked_at).toBeNull()

    const found = await db.findDailyTrigger('p1', '2023-01-08')
    expect(found?.id).toBe(trigger.id)

    await db.markDailyTriggerSent(trigger.id, '2023-01-08T05:00:00.000Z')
    await db.markDailyTriggerClicked(trigger.id, '2023-01-08T06:00:00.000Z')
    const updated = await db.getDailyTrigger(trigger.id)
    expect(updated?.trigger_sent_at).toBe('2023-01-08T05:00:00.000Z')
    expect(updated?.clicked_at).toBe('2023-01-08T06:00:00.000Z')
  })

  it('getUnsentDailyTriggers מחזיר רק טריגרים של אותו תאריך שעדיין לא נשלחו', async () => {
    const db = createLocalDb()
    const t1 = await db.createDailyTrigger({ participantId: 'p1', calendarDate: '2023-01-08', contentDayNumber: 1 })
    await db.createDailyTrigger({ participantId: 'p2', calendarDate: '2023-01-08', contentDayNumber: 1 })
    await db.markDailyTriggerSent(t1.id, '2023-01-08T05:00:00.000Z')
    await db.createDailyTrigger({ participantId: 'p3', calendarDate: '2023-01-09', contentDayNumber: 2 })

    const unsent = await db.getUnsentDailyTriggers('2023-01-08')
    expect(unsent).toHaveLength(1)
    expect(unsent[0].participant_id).toBe('p2')
  })

  it('getPendingDeliveriesForTrigger מחזיר רק pending של אותו trigger שזמנן עבר', async () => {
    const db = createLocalDb()
    const trigger = await db.createDailyTrigger({ participantId: 'p1', calendarDate: '2023-01-08', contentDayNumber: 1 })
    const early = await db.createMessageDelivery({
      participantId: 'p1',
      messageId: 'm1',
      dailyTriggerId: trigger.id,
      scheduledFor: '2023-01-08T05:00:00.000Z',
    })
    await db.createMessageDelivery({
      participantId: 'p1',
      messageId: 'm2',
      dailyTriggerId: trigger.id,
      scheduledFor: '2023-01-08T09:00:00.000Z', // עדיין לא הגיע
    })

    const due = await db.getPendingDeliveriesForTrigger(trigger.id, '2023-01-08T07:00:00.000Z')
    expect(due).toHaveLength(1)
    expect(due[0].id).toBe(early.id)
  })

  it('getDuePendingDeliveriesWithClickedTrigger מתעלם מ-trigger שלא נלחץ', async () => {
    const db = createLocalDb()
    const clicked = await db.createDailyTrigger({ participantId: 'p1', calendarDate: '2023-01-08', contentDayNumber: 1 })
    await db.markDailyTriggerClicked(clicked.id, '2023-01-08T06:00:00.000Z')
    const notClicked = await db.createDailyTrigger({ participantId: 'p2', calendarDate: '2023-01-08', contentDayNumber: 1 })

    const dueForClicked = await db.createMessageDelivery({
      participantId: 'p1',
      messageId: 'm1',
      dailyTriggerId: clicked.id,
      scheduledFor: '2023-01-08T05:00:00.000Z',
    })
    await db.createMessageDelivery({
      participantId: 'p2',
      messageId: 'm1',
      dailyTriggerId: notClicked.id,
      scheduledFor: '2023-01-08T05:00:00.000Z',
    })

    const due = await db.getDuePendingDeliveriesWithClickedTrigger('2023-01-08T07:00:00.000Z')
    expect(due).toHaveLength(1)
    expect(due[0].id).toBe(dueForClicked.id)
  })

  it('markDeliverySent מעדכן status ו-sent_at', async () => {
    const db = createLocalDb()
    const trigger = await db.createDailyTrigger({ participantId: 'p1', calendarDate: '2023-01-08', contentDayNumber: 1 })
    const delivery = await db.createMessageDelivery({
      participantId: 'p1',
      messageId: 'm1',
      dailyTriggerId: trigger.id,
      scheduledFor: '2023-01-08T05:00:00.000Z',
    })
    await db.markDeliverySent(delivery.id, '2023-01-08T05:01:00.000Z')
    const due = await db.getPendingDeliveriesForTrigger(trigger.id, '2023-01-08T07:00:00.000Z')
    expect(due).toHaveLength(0) // כבר sent, לא pending
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd hachamama-parenting-program/server
npx vitest run src/repository/local-impl.test.ts
```

Expected: FAIL — the `throw new Error('not implemented yet — Task 4')` stubs.

- [ ] **Step 3: Replace the Task-4 stubs in `local-impl.ts`** with:

```ts
    async createContentDay(input) {
      const row: ContentDayRow = { day_number: input.dayNumber, title: input.title }
      contentDays.set(row.day_number, row)
      return row
    },

    async getContentDay(dayNumber) {
      return contentDays.get(dayNumber)
    },

    async getMaxContentDayNumber() {
      const nums = [...contentDays.keys()]
      return nums.length ? Math.max(...nums) : 0
    },

    async createMessage(input) {
      const row: MessageRow = {
        id: randomUUID(),
        content_day_number: input.contentDayNumber,
        send_offset_time: input.sendOffsetTime,
        order_in_day: input.orderInDay,
        body_text: input.bodyText,
        media_url: input.mediaUrl,
        media_type: input.mediaType,
      }
      messages.set(row.id, row)
      return row
    },

    async getMessage(id) {
      return messages.get(id)
    },

    async getMessagesForContentDay(dayNumber) {
      return [...messages.values()]
        .filter((m) => m.content_day_number === dayNumber)
        .sort((a, b) => a.order_in_day - b.order_in_day)
    },

    async createDailyTrigger(input) {
      const row: DailyTriggerRow = {
        id: randomUUID(),
        participant_id: input.participantId,
        calendar_date: input.calendarDate,
        content_day_number: input.contentDayNumber,
        trigger_sent_at: null,
        clicked_at: null,
      }
      dailyTriggers.set(row.id, row)
      return row
    },

    async findDailyTrigger(participantId, calendarDate) {
      return [...dailyTriggers.values()].find(
        (t) => t.participant_id === participantId && t.calendar_date === calendarDate,
      )
    },

    async getDailyTrigger(id) {
      return dailyTriggers.get(id)
    },

    async getUnsentDailyTriggers(calendarDate) {
      return [...dailyTriggers.values()].filter((t) => t.calendar_date === calendarDate && !t.trigger_sent_at)
    },

    async markDailyTriggerSent(id, sentAt) {
      const row = dailyTriggers.get(id)
      if (row) dailyTriggers.set(id, { ...row, trigger_sent_at: sentAt })
    },

    async markDailyTriggerClicked(id, clickedAt) {
      const row = dailyTriggers.get(id)
      if (row) dailyTriggers.set(id, { ...row, clicked_at: clickedAt })
    },

    async createMessageDelivery(input) {
      const row: MessageDeliveryRow = {
        id: randomUUID(),
        participant_id: input.participantId,
        message_id: input.messageId,
        daily_trigger_id: input.dailyTriggerId,
        scheduled_for: input.scheduledFor,
        status: 'pending',
        sent_at: null,
      }
      messageDeliveries.set(row.id, row)
      return row
    },

    async getPendingDeliveriesForTrigger(dailyTriggerId, upTo) {
      // הערה: השוואת מחרוזות ISO תקינה כרונולוגית רק כי כל התאריכים באותו פורמט UTC (toISOString()).
      return [...messageDeliveries.values()].filter(
        (d) => d.daily_trigger_id === dailyTriggerId && d.status === 'pending' && d.scheduled_for <= upTo,
      )
    },

    async getDuePendingDeliveriesWithClickedTrigger(now) {
      return [...messageDeliveries.values()].filter((d) => {
        if (d.status !== 'pending' || d.scheduled_for > now) return false
        const trigger = dailyTriggers.get(d.daily_trigger_id)
        return !!trigger?.clicked_at
      })
    },

    async markDeliverySent(id, sentAt) {
      const row = messageDeliveries.get(id)
      if (row) messageDeliveries.set(id, { ...row, status: 'sent', sent_at: sentAt })
    },
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd hachamama-parenting-program/server
npx vitest run src/repository/local-impl.test.ts
```

Expected: PASS — 10 tests total (4 from Task 3 + 6 new).

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/server/src/repository
git commit -m "feat(hachamama): implement local-impl content, daily trigger, and delivery methods"
```

---

### Task 5: Local repository — session windows

**Files:**
- Modify: `hachamama-parenting-program/server/src/repository/local-impl.ts`
- Modify: `hachamama-parenting-program/server/src/repository/local-impl.test.ts`

- [ ] **Step 1: Add failing tests** (append to `local-impl.test.ts`)

```ts
describe('createLocalDb — session windows', () => {
  it('חלון סגור כברירת מחדל למי שלא לחץ מעולם', async () => {
    const db = createLocalDb()
    expect(await db.isSessionWindowOpen('p1', '2023-01-08T07:00:00.000Z')).toBe(false)
  })

  it('נפתח אחרי openOrExtendSessionWindow, וסגור אחרי expires_at', async () => {
    const db = createLocalDb()
    await db.openOrExtendSessionWindow('p1', '2023-01-09T05:00:00.000Z')
    expect(await db.isSessionWindowOpen('p1', '2023-01-08T10:00:00.000Z')).toBe(true)
    expect(await db.isSessionWindowOpen('p1', '2023-01-09T06:00:00.000Z')).toBe(false)
  })

  it('קריאה שנייה מאריכה את החלון (לא פותחת חלון נפרד)', async () => {
    const db = createLocalDb()
    await db.openOrExtendSessionWindow('p1', '2023-01-08T10:00:00.000Z')
    await db.openOrExtendSessionWindow('p1', '2023-01-09T05:00:00.000Z')
    expect(await db.isSessionWindowOpen('p1', '2023-01-08T23:00:00.000Z')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd hachamama-parenting-program/server
npx vitest run src/repository/local-impl.test.ts
```

Expected: FAIL — `not implemented yet — Task 5`.

- [ ] **Step 3: Replace the Task-5 stubs** with:

```ts
    async openOrExtendSessionWindow(participantId, expiresAt) {
      sessionWindows.set(participantId, {
        participant_id: participantId,
        opened_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
    },

    async isSessionWindowOpen(participantId, now) {
      const row = sessionWindows.get(participantId)
      return !!row && row.expires_at > now
    },
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd hachamama-parenting-program/server
npx vitest run src/repository/local-impl.test.ts
```

Expected: PASS — 13 tests total.

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/server/src/repository
git commit -m "feat(hachamama): implement local-impl session window methods"
```

---

### Task 6: Repository factory (`createDb`)

**Files:**
- Create: `hachamama-parenting-program/server/src/repository/db.ts`
- Create: `hachamama-parenting-program/server/src/repository/db.test.ts`

`supabase-impl.ts` doesn't exist yet (Task 13) — this factory is written now with a lazy dynamic `import()` so the module compiles today and gains real Supabase support later without changing this file's tests.

- [ ] **Step 1: Write the failing test**

```ts
// hachamama-parenting-program/server/src/repository/db.test.ts
import { describe, expect, it } from 'vitest'
import { createDb } from './db'

describe('createDb', () => {
  it('בלי SUPABASE_URL/KEY מחזיר local db תקין', async () => {
    const db = await createDb(undefined, undefined)
    const p = await db.createParticipant({
      fullName: 'בדיקה',
      phone: '+972500000000',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    expect(p.id).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd hachamama-parenting-program/server
npx vitest run src/repository/db.test.ts
```

Expected: FAIL — `Cannot find module './db'`.

- [ ] **Step 3: Implement `src/repository/db.ts`**

```ts
// Factory: Supabase אם URL+key מוגדרים, אחרת local (in-memory).
// import דינמי ל-supabase-impl כדי שסביבת בדיקות בלי Supabase לא תצטרך לטעון אותו כלל.
import type { AppDB } from './interface'
import { createLocalDb } from './local-impl'

export async function createDb(supabaseUrl?: string, supabaseKey?: string): Promise<AppDB> {
  if (supabaseUrl && supabaseKey) {
    const { createSupabaseDb } = await import('./supabase-impl')
    return createSupabaseDb(supabaseUrl, supabaseKey)
  }
  console.log('[db] Supabase לא מוגדר — משתמש ב-local DB (in-memory)')
  return createLocalDb()
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd hachamama-parenting-program/server
npx vitest run src/repository/db.test.ts
```

Expected: PASS — 1 test. (`./supabase-impl` isn't created until Task 13, but the dynamic import is never reached in this test since both args are `undefined`.)

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/server/src/repository/db.ts hachamama-parenting-program/server/src/repository/db.test.ts
git commit -m "feat(hachamama): add createDb repository factory"
```

---

### Task 7: Make.com client (real + fake test double)

**Files:**
- Create: `hachamama-parenting-program/server/src/make/client.ts`
- Create: `hachamama-parenting-program/server/src/make/client.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// hachamama-parenting-program/server/src/make/client.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFakeMakeClient, createMakeClient } from './client'

describe('createMakeClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sendMorningTrigger שולח POST עם kind=morning_trigger ל-webhook URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    const client = createMakeClient('https://hook.make.com/abc')
    await client.sendMorningTrigger({ phone: '+972501234567', dayOfWeekName: 'שלישי', buttonPayload: 'trigger-1' })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://hook.make.com/abc',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          kind: 'morning_trigger',
          phone: '+972501234567',
          dayOfWeekName: 'שלישי',
          buttonPayload: 'trigger-1',
        }),
      }),
    )
  })

  it('sendSessionMessage שולח POST עם kind=session_message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    const client = createMakeClient('https://hook.make.com/abc')
    await client.sendSessionMessage({ phone: '+972501234567', bodyText: 'הי!', mediaUrl: null, mediaType: null })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [, options] = fetchMock.mock.calls[0]
    expect(JSON.parse(options.body).kind).toBe('session_message')
  })

  it('זורק שגיאה כש-Make מחזיר סטטוס לא תקין', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    const client = createMakeClient('https://hook.make.com/abc')
    await expect(
      client.sendSessionMessage({ phone: '+972501234567', bodyText: 'הי', mediaUrl: null, mediaType: null }),
    ).rejects.toThrow('500')
  })
})

describe('createFakeMakeClient', () => {
  it('רושם קריאות בלי לבצע HTTP אמיתי — לשימוש בבדיקות jobs', async () => {
    const fake = createFakeMakeClient()
    await fake.sendMorningTrigger({ phone: '+972501234567', dayOfWeekName: 'שני', buttonPayload: 't1' })
    expect(fake.morningTriggersSent).toHaveLength(1)
    expect(fake.morningTriggersSent[0].buttonPayload).toBe('t1')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd hachamama-parenting-program/server
npx vitest run src/make/client.test.ts
```

Expected: FAIL — `Cannot find module './client'`.

- [ ] **Step 3: Implement `src/make/client.ts`**

```ts
// לקוח ל-custom webhook של Make.com — הצינור היחיד שמדבר בפועל עם WhatsApp (ראו design doc).
export interface MakeClient {
  sendMorningTrigger(input: { phone: string; dayOfWeekName: string; buttonPayload: string }): Promise<void>
  sendSessionMessage(input: {
    phone: string
    bodyText: string
    mediaUrl: string | null
    mediaType: string | null
  }): Promise<void>
}

export function createMakeClient(webhookUrl: string): MakeClient {
  return {
    async sendMorningTrigger(input) {
      await postToMake(webhookUrl, { kind: 'morning_trigger', ...input })
    },
    async sendSessionMessage(input) {
      await postToMake(webhookUrl, { kind: 'session_message', ...input })
    },
  }
}

async function postToMake(url: string, payload: unknown): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Make webhook החזיר סטטוס ${res.status}`)
  }
}

export interface FakeMakeClient extends MakeClient {
  morningTriggersSent: Array<{ phone: string; dayOfWeekName: string; buttonPayload: string }>
  sessionMessagesSent: Array<{ phone: string; bodyText: string; mediaUrl: string | null; mediaType: string | null }>
}

/** תחליף-בדיקה ל-MakeClient — לא מבצע HTTP, רק רושם מה נשלח. לשימוש ב-jobs tests. */
export function createFakeMakeClient(): FakeMakeClient {
  const morningTriggersSent: FakeMakeClient['morningTriggersSent'] = []
  const sessionMessagesSent: FakeMakeClient['sessionMessagesSent'] = []
  return {
    morningTriggersSent,
    sessionMessagesSent,
    async sendMorningTrigger(input) {
      morningTriggersSent.push(input)
    },
    async sendSessionMessage(input) {
      sessionMessagesSent.push(input)
    },
  }
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd hachamama-parenting-program/server
npx vitest run src/make/client.test.ts
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/server/src/make
git commit -m "feat(hachamama): add Make.com client with fake test double"
```

---

### Task 8: Daily generation job (JIT)

**Files:**
- Create: `hachamama-parenting-program/server/src/jobs/generate-daily.ts`
- Create: `hachamama-parenting-program/server/src/jobs/generate-daily.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// hachamama-parenting-program/server/src/jobs/generate-daily.test.ts
import { describe, expect, it } from 'vitest'
import { createLocalDb } from '../repository/local-impl'
import { generateDailyDeliveries } from './generate-daily'

async function seedTwoDayProgram(db: ReturnType<typeof createLocalDb>) {
  await db.createContentDay({ dayNumber: 1, title: 'יום 1' })
  await db.createMessage({
    contentDayNumber: 1,
    sendOffsetTime: '06:00',
    orderInDay: 1,
    bodyText: 'בוקר טוב יום 1',
    mediaUrl: null,
    mediaType: null,
  })
  await db.createMessage({
    contentDayNumber: 1,
    sendOffsetTime: '08:00',
    orderInDay: 2,
    bodyText: 'עוד הודעה יום 1',
    mediaUrl: null,
    mediaType: null,
  })
  await db.createContentDay({ dayNumber: 2, title: 'יום 2' })
  await db.createMessage({
    contentDayNumber: 2,
    sendOffsetTime: '07:00',
    orderInDay: 1,
    bodyText: 'בוקר טוב יום 2',
    mediaUrl: null,
    mediaType: null,
  })
}

describe('generateDailyDeliveries', () => {
  it('יוצר daily_trigger אחד + message_delivery לכל הודעה, ליום המתאים לנרשם', async () => {
    const db = createLocalDb()
    await seedTwoDayProgram(db)
    const participant = await db.createParticipant({
      fullName: 'ישראל ישראלי',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })

    const result = await generateDailyDeliveries(db, '2023-01-08') // היום = day1_date שלו = יום 1

    expect(result).toEqual({ triggersCreated: 1, deliveriesCreated: 2, participantsCompleted: 0 })
    const trigger = await db.findDailyTrigger(participant.id, '2023-01-08')
    expect(trigger?.content_day_number).toBe(1)
    const deliveries = await db.getPendingDeliveriesForTrigger(trigger!.id, '2099-01-01T00:00:00.000Z')
    expect(deliveries).toHaveLength(2)
  })

  it('אידמפוטנטי — ריצה כפולה לאותו יום לא יוצרת כפילויות', async () => {
    const db = createLocalDb()
    await seedTwoDayProgram(db)
    await db.createParticipant({
      fullName: 'ישראל ישראלי',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })

    await generateDailyDeliveries(db, '2023-01-08')
    const second = await generateDailyDeliveries(db, '2023-01-08')

    expect(second).toEqual({ triggersCreated: 0, deliveriesCreated: 0, participantsCompleted: 0, errors: [] })
  })

  it('נרשם שעדיין לא הגיע ה-day1_date שלו לא מקבל כלום', async () => {
    const db = createLocalDb()
    await seedTwoDayProgram(db)
    await db.createParticipant({
      fullName: 'טרם הגיע',
      phone: '+972500000009',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })

    const result = await generateDailyDeliveries(db, '2023-01-07') // יום לפני day1_date

    expect(result).toEqual({ triggersCreated: 0, deliveriesCreated: 0, participantsCompleted: 0, errors: [] })
  })

  it('נרשם שעבר את אורך התוכנית מסומן completed ולא מקבל עוד הודעות', async () => {
    const db = createLocalDb()
    await seedTwoDayProgram(db) // 2 ימים בסך הכל
    const participant = await db.createParticipant({
      fullName: 'סיים',
      phone: '+972500000008',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })

    const result = await generateDailyDeliveries(db, '2023-01-10') // day1+2 = יום 3, אין יום 3

    expect(result.participantsCompleted).toBe(1)
    const updated = await db.getParticipant(participant.id)
    expect(updated?.status).toBe('completed')
    const active = await db.getActiveParticipants()
    expect(active).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd hachamama-parenting-program/server
npx vitest run src/jobs/generate-daily.test.ts
```

Expected: FAIL — `Cannot find module './generate-daily'`.

- [ ] **Step 3: Implement `src/jobs/generate-daily.ts`**

```ts
// ריצה יומית (JIT) — לא בזמן ההרשמה. ראו design doc: "מנוע התזמון — Just-In-Time".
// תוכן שנערך היום חל אוטומטית על מי שעדיין לא הגיע לאותו יום, כי קוראים את התוכן
// העדכני כאן, לא בזמן ההרשמה.
import type { AppDB } from '../repository/interface'
import { calculateProgramDayNumber, combineDateAndTimeInIsrael } from '../domain/scheduling'

export interface GenerateDailyResult {
  triggersCreated: number
  deliveriesCreated: number
  participantsCompleted: number
}

export async function generateDailyDeliveries(db: AppDB, todayDate: string): Promise<GenerateDailyResult> {
  const participants = await db.getActiveParticipants()
  const maxDay = await db.getMaxContentDayNumber()

  let triggersCreated = 0
  let deliveriesCreated = 0
  let participantsCompleted = 0

  for (const participant of participants) {
    const dayNumber = calculateProgramDayNumber(participant.day1_date, todayDate)

    if (dayNumber > maxDay) {
      await db.markParticipantCompleted(participant.id)
      participantsCompleted++
      continue
    }
    if (dayNumber < 1) continue // עדיין לא הגיע ה-day1_date שלו

    const contentDay = await db.getContentDay(dayNumber)
    if (!contentDay) continue // אין תוכן מוגדר ליום הזה — לא יוצרים כלום

    const existingTrigger = await db.findDailyTrigger(participant.id, todayDate)
    if (existingTrigger) continue // אידמפוטנטי — כבר רץ היום עבור הנרשם הזה

    const trigger = await db.createDailyTrigger({
      participantId: participant.id,
      calendarDate: todayDate,
      contentDayNumber: dayNumber,
    })
    triggersCreated++

    const messages = await db.getMessagesForContentDay(dayNumber)
    for (const message of messages) {
      const scheduledFor = combineDateAndTimeInIsrael(todayDate, message.send_offset_time).toISOString()
      await db.createMessageDelivery({
        participantId: participant.id,
        messageId: message.id,
        dailyTriggerId: trigger.id,
        scheduledFor,
      })
      deliveriesCreated++
    }
  }

  return { triggersCreated, deliveriesCreated, participantsCompleted }
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd hachamama-parenting-program/server
npx vitest run src/jobs/generate-daily.test.ts
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/server/src/jobs/generate-daily.ts hachamama-parenting-program/server/src/jobs/generate-daily.test.ts
git commit -m "feat(hachamama): add JIT daily generation job"
```

**Amendment (post-review, applied during execution):** code review flagged that an unhandled exception for one participant would abort the entire run, leaving every later participant in `getActiveParticipants()` unprocessed that day. Fixed by wrapping each participant's per-iteration body in try/catch and adding an `errors: Array<{ participantId: string; error: string }>` field to `GenerateDailyResult` (also reflected in the `toEqual` assertions above and in Task 12's cron-route test). A new test simulates a per-participant failure via a monkey-patched `db.createDailyTrigger` and confirms the other participant is still processed. See commit `b327f27` on the `worktree-hachamama-core-engine` branch.

---

### Task 9: Morning trigger-send job

**Files:**
- Create: `hachamama-parenting-program/server/src/jobs/send-triggers.ts`
- Create: `hachamama-parenting-program/server/src/jobs/send-triggers.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// hachamama-parenting-program/server/src/jobs/send-triggers.test.ts
import { describe, expect, it } from 'vitest'
import { createFakeMakeClient } from '../make/client'
import { createLocalDb } from '../repository/local-impl'
import { sendMorningTriggers } from './send-triggers'

describe('sendMorningTriggers', () => {
  it('שולח טריגר לכל daily_trigger שעדיין לא נשלח, עם יום-בשבוע ו-button_payload נכונים', async () => {
    const db = createLocalDb()
    const participant = await db.createParticipant({
      fullName: 'ישראל ישראלי',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    const trigger = await db.createDailyTrigger({
      participantId: participant.id,
      calendarDate: '2023-01-10', // יום שלישי
      contentDayNumber: 3,
    })
    const makeClient = createFakeMakeClient()

    const result = await sendMorningTriggers(db, makeClient, '2023-01-10')

    expect(result.sent).toBe(1)
    expect(makeClient.morningTriggersSent).toEqual([
      { phone: '+972501234567', dayOfWeekName: 'שלישי', buttonPayload: trigger.id },
    ])
    const updated = await db.getDailyTrigger(trigger.id)
    expect(updated?.trigger_sent_at).toBeTruthy()
  })

  it('לא שולח שוב טריגר שכבר נשלח', async () => {
    const db = createLocalDb()
    const participant = await db.createParticipant({
      fullName: 'ישראל',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    const trigger = await db.createDailyTrigger({
      participantId: participant.id,
      calendarDate: '2023-01-10',
      contentDayNumber: 3,
    })
    await db.markDailyTriggerSent(trigger.id, '2023-01-10T05:00:00.000Z')
    const makeClient = createFakeMakeClient()

    const result = await sendMorningTriggers(db, makeClient, '2023-01-10')

    expect(result.sent).toBe(0)
    expect(makeClient.morningTriggersSent).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd hachamama-parenting-program/server
npx vitest run src/jobs/send-triggers.test.ts
```

Expected: FAIL — `Cannot find module './send-triggers'`.

- [ ] **Step 3: Implement `src/jobs/send-triggers.ts`**

```ts
// ריצת בוקר — שולחת ל-Make את הודעת הטריגר (תבנית מאושרת + כפתור) לכל daily_trigger
// שנוצר היום ועדיין לא נשלח. ה-button_payload הוא ה-id של ה-trigger עצמו — ראו design doc
// "עקרון מרכזי": לחיצה על הכפתור הזה תשחרר בעתיד רק את היום הספציפי הזה.
import type { AppDB } from '../repository/interface'
import type { MakeClient } from '../make/client'

export interface SendTriggersResult {
  sent: number
}

const DAY_OF_WEEK_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export async function sendMorningTriggers(
  db: AppDB,
  makeClient: MakeClient,
  todayDate: string,
): Promise<SendTriggersResult> {
  const triggers = await db.getUnsentDailyTriggers(todayDate)
  let sent = 0

  for (const trigger of triggers) {
    const participant = await db.getParticipant(trigger.participant_id)
    if (!participant) continue

    const dayOfWeekName = DAY_OF_WEEK_HE[new Date(`${trigger.calendar_date}T00:00:00Z`).getUTCDay()]

    await makeClient.sendMorningTrigger({
      phone: participant.phone,
      dayOfWeekName,
      buttonPayload: trigger.id,
    })
    await db.markDailyTriggerSent(trigger.id, new Date().toISOString())
    sent++
  }

  return { sent }
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd hachamama-parenting-program/server
npx vitest run src/jobs/send-triggers.test.ts
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/server/src/jobs/send-triggers.ts hachamama-parenting-program/server/src/jobs/send-triggers.test.ts
git commit -m "feat(hachamama): add morning trigger-send job"
```

**Amendment (post-review, applied during execution):** same bug class as Task 8, flagged again by code review — and worse here, since `getUnsentDailyTriggers` filters on an exact `calendar_date` match, so a failure never gets a retry window the next day (unlike `generate-daily`/`drip`, which re-evaluate live state every run). Fixed by wrapping each trigger's send in try/catch and adding `errors: Array<{ dailyTriggerId: string; error: string }>` to `SendTriggersResult` (reflected in the `toEqual` above and in Task 12's cron-route test). See commit `167a6e0`.

---

### Task 10: Real-time drip job

**Files:**
- Create: `hachamama-parenting-program/server/src/jobs/drip.ts`
- Create: `hachamama-parenting-program/server/src/jobs/drip.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// hachamama-parenting-program/server/src/jobs/drip.test.ts
import { describe, expect, it } from 'vitest'
import { createFakeMakeClient } from '../make/client'
import { createLocalDb } from '../repository/local-impl'
import { runDrip } from './drip'

async function setupClickedParticipantWithDueMessage(db: ReturnType<typeof createLocalDb>) {
  const participant = await db.createParticipant({
    fullName: 'ישראל ישראלי',
    phone: '+972501234567',
    signupSourceRef: null,
    signupAt: '2023-01-05T10:00:00.000Z',
    day1Date: '2023-01-08',
  })
  const message = await db.createMessage({
    contentDayNumber: 1,
    sendOffsetTime: '09:00',
    orderInDay: 1,
    bodyText: 'הודעת 9 בבוקר',
    mediaUrl: null,
    mediaType: null,
  })
  const trigger = await db.createDailyTrigger({
    participantId: participant.id,
    calendarDate: '2023-01-08',
    contentDayNumber: 1,
  })
  await db.markDailyTriggerClicked(trigger.id, '2023-01-08T06:00:00.000Z')
  await db.openOrExtendSessionWindow(participant.id, '2023-01-09T06:00:00.000Z')
  const delivery = await db.createMessageDelivery({
    participantId: participant.id,
    messageId: message.id,
    dailyTriggerId: trigger.id,
    scheduledFor: '2023-01-08T09:00:00.000Z',
  })
  return { participant, message, trigger, delivery }
}

describe('runDrip', () => {
  it('שולח הודעה שהגיע זמנה, ה-trigger שלה נלחץ, והחלון פתוח', async () => {
    const db = createLocalDb()
    const { participant, delivery } = await setupClickedParticipantWithDueMessage(db)
    const makeClient = createFakeMakeClient()

    const result = await runDrip(db, makeClient, '2023-01-08T09:01:00.000Z')

    expect(result.sent).toBe(1)
    expect(makeClient.sessionMessagesSent).toEqual([
      { phone: participant.phone, bodyText: 'הודעת 9 בבוקר', mediaUrl: null, mediaType: null },
    ])
    const deliveries = await db.getPendingDeliveriesForTrigger(delivery.daily_trigger_id, '2099-01-01T00:00:00.000Z')
    expect(deliveries).toHaveLength(0) // כבר sent
  })

  it('לא שולח לפני שהגיע הזמן', async () => {
    const db = createLocalDb()
    await setupClickedParticipantWithDueMessage(db)
    const makeClient = createFakeMakeClient()

    const result = await runDrip(db, makeClient, '2023-01-08T08:00:00.000Z') // לפני 09:00

    expect(result.sent).toBe(0)
  })

  it('לא שולח אם החלון נסגר, גם אם ה-trigger נלחץ ואיחר', async () => {
    const db = createLocalDb()
    const { } = await setupClickedParticipantWithDueMessage(db)
    const makeClient = createFakeMakeClient()

    const result = await runDrip(db, makeClient, '2023-01-10T00:00:00.000Z') // אחרי expires_at

    expect(result.sent).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd hachamama-parenting-program/server
npx vitest run src/jobs/drip.test.ts
```

Expected: FAIL — `Cannot find module './drip'`.

- [ ] **Step 3: Implement `src/jobs/drip.ts`**

```ts
// ריצה בתדירות גבוהה (כל כמה דקות) — שולחת הודעות שהגיע זמנן, רק אם ה-daily_trigger
// שלהן נלחץ (שחרור per-day, ראו design doc) וגם קיים חלון-שירות טכני פתוח.
import type { AppDB } from '../repository/interface'
import type { MakeClient } from '../make/client'

export interface DripResult {
  sent: number
}

export async function runDrip(db: AppDB, makeClient: MakeClient, now: string): Promise<DripResult> {
  const due = await db.getDuePendingDeliveriesWithClickedTrigger(now)
  let sent = 0

  for (const delivery of due) {
    const windowOpen = await db.isSessionWindowOpen(delivery.participant_id, now)
    if (!windowOpen) continue

    const participant = await db.getParticipant(delivery.participant_id)
    const message = await db.getMessage(delivery.message_id)
    if (!participant || !message) continue

    await makeClient.sendSessionMessage({
      phone: participant.phone,
      bodyText: message.body_text,
      mediaUrl: message.media_url,
      mediaType: message.media_type,
    })
    await db.markDeliverySent(delivery.id, now)
    sent++
  }

  return { sent }
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd hachamama-parenting-program/server
npx vitest run src/jobs/drip.test.ts
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/server/src/jobs/drip.ts hachamama-parenting-program/server/src/jobs/drip.test.ts
git commit -m "feat(hachamama): add real-time drip job"
```

---

### Task 11: Webhook routes (signup + Make button-click)

**Files:**
- Create: `hachamama-parenting-program/server/src/routes/webhooks.ts`
- Create: `hachamama-parenting-program/server/src/routes/webhooks.test.ts`
- Modify: `hachamama-parenting-program/server/src/app.ts`
- Modify: `hachamama-parenting-program/server/src/app.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// hachamama-parenting-program/server/src/routes/webhooks.test.ts
import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { env } from '../env'
import { createFakeMakeClient } from '../make/client'
import { createLocalDb } from '../repository/local-impl'

function buildApp() {
  const db = createLocalDb()
  const makeClient = createFakeMakeClient()
  const app = createApp({ db, makeClient, env })
  return { app, db, makeClient }
}

describe('POST /api/webhooks/signup', () => {
  it('דוחה בקשה בלי Authorization תקין', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/webhooks/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fullName: 'ישראל', phone: '+972501234567' }),
    })
    expect(res.status).toBe(401)
  })

  it('יוצר נרשם עם day1_date מחושב, עם Authorization תקין', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/webhooks/signup', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.SIGNUP_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({ fullName: 'ישראל ישראלי', phone: '+972501234567', signupSourceRef: 'ext-1' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.participantId).toBeTruthy()
    expect(body.day1Date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('דוחה גוף בקשה לא תקין (טלפון חסר)', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/webhooks/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.SIGNUP_WEBHOOK_SECRET}` },
      body: JSON.stringify({ fullName: 'ישראל' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/webhooks/make/button-click', () => {
  it('דוחה בלי Authorization תקין', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/webhooks/make/button-click', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '+972501234567', buttonPayload: 'x' }),
    })
    expect(res.status).toBe(401)
  })

  it('מחזיר 404 כש-button_payload לא קיים', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/webhooks/make/button-click', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.MAKE_WEBHOOK_SECRET}` },
      body: JSON.stringify({ phone: '+972501234567', buttonPayload: 'missing-id' }),
    })
    expect(res.status).toBe(404)
  })

  it('מחזיר 403 כשהטלפון לא תואם את בעל ה-trigger', async () => {
    const { app, db } = buildApp()
    const participant = await db.createParticipant({
      fullName: 'א',
      phone: '+972501111111',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    const trigger = await db.createDailyTrigger({
      participantId: participant.id,
      calendarDate: '2023-01-08',
      contentDayNumber: 1,
    })

    const res = await app.request('/api/webhooks/make/button-click', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.MAKE_WEBHOOK_SECRET}` },
      body: JSON.stringify({ phone: '+972502222222', buttonPayload: trigger.id }),
    })
    expect(res.status).toBe(403)
  })

  it('מסמן clicked_at, פותח session window, ומחזיר רק הודעות שכבר הגיע זמנן לאותו trigger', async () => {
    const { app, db } = buildApp()
    const participant = await db.createParticipant({
      fullName: 'ישראל',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    const trigger = await db.createDailyTrigger({
      participantId: participant.id,
      calendarDate: '2023-01-08',
      contentDayNumber: 1,
    })
    const early = await db.createMessage({
      contentDayNumber: 1,
      sendOffsetTime: '05:00',
      orderInDay: 1,
      bodyText: 'הודעה מוקדמת',
      mediaUrl: null,
      mediaType: null,
    })
    await db.createMessageDelivery({
      participantId: participant.id,
      messageId: early.id,
      dailyTriggerId: trigger.id,
      // הראוט משתמש בזמן אמת (new Date()), לא בזמן מוזרק — לכן התאריכים כאן
      // חייבים להיות יחסיים ל-Date.now() בפועל, לא תאריכים קבועים מהעבר/עתיד.
      scheduledFor: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // לפני שעה — עבר
    })
    const late = await db.createMessage({
      contentDayNumber: 1,
      sendOffsetTime: '20:00',
      orderInDay: 2,
      bodyText: 'הודעה מאוחרת',
      mediaUrl: null,
      mediaType: null,
    })
    await db.createMessageDelivery({
      participantId: participant.id,
      messageId: late.id,
      dailyTriggerId: trigger.id,
      scheduledFor: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // בעוד שעה — עתיד
    })

    const res = await app.request('/api/webhooks/make/button-click', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.MAKE_WEBHOOK_SECRET}` },
      body: JSON.stringify({ phone: '+972501234567', buttonPayload: trigger.id }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.messages).toEqual([{ bodyText: 'הודעה מוקדמת', mediaUrl: null, mediaType: null }])

    const updatedTrigger = await db.getDailyTrigger(trigger.id)
    expect(updatedTrigger?.clicked_at).toBeTruthy()
    expect(await db.isSessionWindowOpen(participant.id, new Date().toISOString())).toBe(true)
  })
})
```

**Note on real-time clock in this route:** unlike the jobs (Tasks 8-10), which take `now`/`todayDate` as explicit parameters for testability, the webhook route calls `new Date()` internally — that's why the last test above builds `scheduledFor` from `Date.now() ± 1h` instead of fixed dates: it must stay correctly "past" or "future" relative to whatever the real clock is when the suite runs, years after this plan was written. This matches the design doc's synchronous webhook response.

- [ ] **Step 2: Run to verify it fails**

```bash
cd hachamama-parenting-program/server
npx vitest run src/routes/webhooks.test.ts
```

Expected: FAIL — `Cannot find module '../routes/webhooks'` / `createApp` doesn't accept `db`/`makeClient` yet.

- [ ] **Step 3: Implement `src/routes/webhooks.ts`**

```ts
// Webhooks חיצוניים — הרשמה (ממערכת צד-שלישי) ולחיצת כפתור (מ-Make.com).
// SECURITY: שני ה-endpoints האלה חשופים לאינטרנט וכותבים ל-DB — מוגנים בסוד משותף
// ב-Authorization header, לא רק CORS/רשת. בלי זה כל אחד יכול ליצור נרשמים בדויים
// או "ללחוץ כפתורים" בשם נרשמים אחרים.
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppContext } from '../context'
import { calculateDay1Date } from '../domain/scheduling'

const SignupSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'טלפון חייב להיות בפורמט E.164, למשל +972501234567'),
  signupSourceRef: z.string().optional(),
})

const ButtonClickSchema = z.object({
  phone: z.string().min(1),
  buttonPayload: z.string().min(1),
})

export function createWebhookRoutes(ctx: AppContext) {
  const app = new Hono()

  app.post('/signup', async (c) => {
    const auth = c.req.header('authorization')
    if (auth !== `Bearer ${ctx.env.SIGNUP_WEBHOOK_SECRET}`) return c.json({ error: 'לא מורשה' }, 401)

    const parsed = SignupSchema.safeParse(await c.req.json())
    if (!parsed.success) return c.json({ error: 'גוף בקשה לא תקין' }, 400)

    const signupAt = new Date().toISOString()
    const day1Date = calculateDay1Date(new Date(signupAt))

    const participant = await ctx.db.createParticipant({
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      signupSourceRef: parsed.data.signupSourceRef ?? null,
      signupAt,
      day1Date,
    })

    return c.json({ participantId: participant.id, day1Date: participant.day1_date }, 201)
  })

  app.post('/make/button-click', async (c) => {
    const auth = c.req.header('authorization')
    if (auth !== `Bearer ${ctx.env.MAKE_WEBHOOK_SECRET}`) return c.json({ error: 'לא מורשה' }, 401)

    const parsed = ButtonClickSchema.safeParse(await c.req.json())
    if (!parsed.success) return c.json({ error: 'גוף בקשה לא תקין' }, 400)

    const trigger = await ctx.db.getDailyTrigger(parsed.data.buttonPayload)
    if (!trigger) return c.json({ error: 'trigger לא נמצא' }, 404)

    const participant = await ctx.db.getParticipant(trigger.participant_id)
    if (!participant || participant.phone !== parsed.data.phone) {
      return c.json({ error: 'אימות נרשם נכשל' }, 403)
    }

    const now = new Date().toISOString()
    if (!trigger.clicked_at) {
      await ctx.db.markDailyTriggerClicked(trigger.id, now)
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    await ctx.db.openOrExtendSessionWindow(participant.id, expiresAt)

    const dueDeliveries = await ctx.db.getPendingDeliveriesForTrigger(trigger.id, now)
    const messages = []
    for (const delivery of dueDeliveries) {
      const message = await ctx.db.getMessage(delivery.message_id)
      messages.push({
        bodyText: message?.body_text ?? '',
        mediaUrl: message?.media_url ?? null,
        mediaType: message?.media_type ?? null,
      })
      await ctx.db.markDeliverySent(delivery.id, now)
    }

    return c.json({ messages })
  })

  return app
}
```

- [ ] **Step 4: Update `src/app.ts`** to accept the real `AppContext` and mount the routes

```ts
// הרכבת אפליקציית ה-Hono — מופרד מ-index.ts כדי שבדיקות יוכלו להרכיב app עם תלויות מדומות.
import { Hono } from 'hono'
import type { AppContext } from './context'
import { createWebhookRoutes } from './routes/webhooks'

export function createApp(ctx: AppContext) {
  const app = new Hono()

  app.get('/api/health', (c) => c.json({ ok: true }))
  app.route('/api/webhooks', createWebhookRoutes(ctx))

  app.onError((err, c) => {
    // SECURITY: לא חושפים stack trace/פרטי שגיאה פנימיים ללקוח — רק ללוג השרת.
    console.error('[server error]', err)
    return c.json({ error: 'שגיאת שרת' }, 500)
  })

  return app
}
```

- [ ] **Step 5: Update `src/app.test.ts`** (the old `@ts-expect-error` health-check test now needs a real context)

```ts
import { describe, expect, it } from 'vitest'
import { createApp } from './app'
import { env } from './env'
import { createFakeMakeClient } from './make/client'
import { createLocalDb } from './repository/local-impl'

describe('GET /api/health', () => {
  it('מחזיר ok:true', async () => {
    const app = createApp({ db: createLocalDb(), makeClient: createFakeMakeClient(), env })
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
```

- [ ] **Step 6: Run to verify it passes**

```bash
cd hachamama-parenting-program/server
npx vitest run
```

Expected: PASS — all test files, including the 9 new webhook tests.

- [ ] **Step 7: Commit**

```bash
git add hachamama-parenting-program/server/src
git commit -m "feat(hachamama): add signup and Make button-click webhook routes"
```

**Amendments (post-review, applied during execution):**
1. `res.json()` returns `Promise<unknown>` under this project's `tsconfig.json` (`lib: ["ES2023"]`, no `"dom"`) — the literal test code's property access on the parsed body (`body.participantId` etc.) is a genuine typecheck regression. Fixed with inline type-cast assertions in the 3 affected assertions (commit `14e3f79`).
2. **Security-relevant fix:** the `/make/button-click` ownership check compared `participant.phone` (stored strict E.164 with `+`) against the incoming phone via raw string equality. Meta/WhatsApp typically sends `wa_id` *without* a leading `+`, which would have made every real button click fail with a false 403 in production. Fixed by comparing digit-only forms via a `phoneDigitsOnly()` helper, with a regression test using a `+`-less phone. Also added `.max(200)` bounds to `fullName`/`signupSourceRef`. See commit `9ccc6aa`.

---

### Task 12: Cron routes (generate-daily, send-triggers, drip)

**Files:**
- Create: `hachamama-parenting-program/server/src/routes/cron.ts`
- Create: `hachamama-parenting-program/server/src/routes/cron.test.ts`
- Modify: `hachamama-parenting-program/server/src/app.ts`

These endpoints are how an external scheduler (Vercel Cron, a hosting platform's scheduled job, or a plain OS cron calling `curl`) triggers the three jobs — following the exact pattern already used for `priority-lite/server/src/routes/cron.ts`'s `CRON_SECRET` Bearer check.

- [ ] **Step 1: Write the failing tests**

```ts
// hachamama-parenting-program/server/src/routes/cron.test.ts
import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { env } from '../env'
import { createFakeMakeClient } from '../make/client'
import { createLocalDb } from '../repository/local-impl'

describe('POST /api/cron/*', () => {
  it('כל שלושת ה-endpoints דוחים בלי CRON_SECRET תקין', async () => {
    const app = createApp({ db: createLocalDb(), makeClient: createFakeMakeClient(), env })
    for (const path of ['generate-daily', 'send-triggers', 'drip']) {
      const res = await app.request(`/api/cron/${path}`, { method: 'POST' })
      expect(res.status).toBe(401)
    }
  })

  it('POST /generate-daily מריץ את הריצה היומית ומחזיר תוצאה', async () => {
    const db = createLocalDb()
    const app = createApp({ db, makeClient: createFakeMakeClient(), env })

    const res = await app.request('/api/cron/generate-daily', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ triggersCreated: 0, deliveriesCreated: 0, participantsCompleted: 0, errors: [] })
  })

  it('POST /send-triggers מריץ את שליחת הטריגרים ומחזיר תוצאה', async () => {
    const app = createApp({ db: createLocalDb(), makeClient: createFakeMakeClient(), env })

    const res = await app.request('/api/cron/send-triggers', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sent: 0, errors: [] })
  })

  it('POST /drip מריץ את ה-drip ומחזיר תוצאה', async () => {
    const app = createApp({ db: createLocalDb(), makeClient: createFakeMakeClient(), env })

    const res = await app.request('/api/cron/drip', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sent: 0, errors: [] })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd hachamama-parenting-program/server
npx vitest run src/routes/cron.test.ts
```

Expected: FAIL — `Cannot find module '../routes/cron'`.

- [ ] **Step 3: Implement `src/routes/cron.ts`**

```ts
// Endpoints שמופעלים ע"י scheduler חיצוני (Vercel Cron / curl מ-cron רגיל וכו').
// SECURITY: מוגן ב-CRON_SECRET בדיוק כמו priority-lite/server/src/routes/cron.ts —
// בלי זה כל אחד יכול להריץ שליחת הודעות אמיתיות ל-WhatsApp על חשבוננו.
import { Hono } from 'hono'
import type { AppContext } from '../context'
import { getIsraelDateString } from '../domain/scheduling'
import { runDrip } from '../jobs/drip'
import { generateDailyDeliveries } from '../jobs/generate-daily'
import { sendMorningTriggers } from '../jobs/send-triggers'

function isAuthorized(ctx: AppContext, authHeader: string | undefined): boolean {
  return authHeader === `Bearer ${ctx.env.CRON_SECRET}`
}

export function createCronRoutes(ctx: AppContext) {
  const app = new Hono()

  app.post('/generate-daily', async (c) => {
    if (!isAuthorized(ctx, c.req.header('authorization'))) return c.json({ error: 'לא מורשה' }, 401)
    const result = await generateDailyDeliveries(ctx.db, getIsraelDateString(new Date()))
    return c.json(result)
  })

  app.post('/send-triggers', async (c) => {
    if (!isAuthorized(ctx, c.req.header('authorization'))) return c.json({ error: 'לא מורשה' }, 401)
    const result = await sendMorningTriggers(ctx.db, ctx.makeClient, getIsraelDateString(new Date()))
    return c.json(result)
  })

  app.post('/drip', async (c) => {
    if (!isAuthorized(ctx, c.req.header('authorization'))) return c.json({ error: 'לא מורשה' }, 401)
    const result = await runDrip(ctx.db, ctx.makeClient, new Date().toISOString())
    return c.json(result)
  })

  return app
}
```

- [ ] **Step 4: Mount the routes in `src/app.ts`**

```ts
// הרכבת אפליקציית ה-Hono — מופרד מ-index.ts כדי שבדיקות יוכלו להרכיב app עם תלויות מדומות.
import { Hono } from 'hono'
import type { AppContext } from './context'
import { createCronRoutes } from './routes/cron'
import { createWebhookRoutes } from './routes/webhooks'

export function createApp(ctx: AppContext) {
  const app = new Hono()

  app.get('/api/health', (c) => c.json({ ok: true }))
  app.route('/api/webhooks', createWebhookRoutes(ctx))
  app.route('/api/cron', createCronRoutes(ctx))

  app.onError((err, c) => {
    // SECURITY: לא חושפים stack trace/פרטי שגיאה פנימיים ללקוח — רק ללוג השרת.
    console.error('[server error]', err)
    return c.json({ error: 'שגיאת שרת' }, 500)
  })

  return app
}
```

- [ ] **Step 5: Run to verify it passes**

```bash
cd hachamama-parenting-program/server
npx vitest run
```

Expected: PASS — all test files.

- [ ] **Step 6: Commit**

```bash
git add hachamama-parenting-program/server/src
git commit -m "feat(hachamama): add cron-triggered job routes"
```

---

### Task 13: Supabase schema + real repository implementation

**Files:**
- Create: `hachamama-parenting-program/server/migrations/0001_init.sql`
- Create: `hachamama-parenting-program/server/src/repository/supabase-impl.ts`
- Create: `hachamama-parenting-program/server/src/repository/supabase-impl.smoke.test.ts`

There is no automated way to provision a real Supabase project from this plan — the engineer (or the user) must create one manually and run the migration. This task's test is a **smoke test**, skipped automatically unless `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` are present in the environment, so the rest of the suite never depends on real infrastructure.

- [ ] **Step 1: Create `migrations/0001_init.sql`**

```sql
-- סכמת הליבה של תוכנית ליווי החממה. ראו design doc: hachamama-parenting-program/docs/2026-07-31-design.md
create extension if not exists pgcrypto;

create table participants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  signup_source_ref text,
  signup_at timestamptz not null,
  day1_date date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  created_at timestamptz not null default now()
);

create table content_days (
  day_number int primary key,
  title text
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  content_day_number int not null references content_days(day_number),
  send_offset_time text not null, -- 'HH:MM', בזמן מקומי ישראל
  order_in_day int not null default 0,
  body_text text not null,
  media_url text,
  media_type text check (media_type in ('image', 'video', 'audio', 'document')),
  created_at timestamptz not null default now()
);

create table daily_triggers (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id),
  calendar_date date not null,
  content_day_number int not null references content_days(day_number),
  trigger_sent_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (participant_id, calendar_date)
);

create table message_deliveries (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id),
  message_id uuid not null references messages(id),
  daily_trigger_id uuid not null references daily_triggers(id),
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (participant_id, message_id)
);

create table session_windows (
  participant_id uuid primary key references participants(id),
  opened_at timestamptz not null,
  expires_at timestamptz not null
);

create index idx_daily_triggers_unsent on daily_triggers (calendar_date) where trigger_sent_at is null;
create index idx_deliveries_by_trigger on message_deliveries (daily_trigger_id, status);
create index idx_deliveries_due_pending on message_deliveries (status, scheduled_for) where status = 'pending';
```

- [ ] **Step 2: Implement `src/repository/supabase-impl.ts`**

```ts
// מימוש Supabase (Postgres אמיתי) של AppDB. הרץ קודם migrations/0001_init.sql
// על פרויקט Supabase, ואז SUPABASE_URL+SUPABASE_SERVICE_KEY מפעילים את המימוש הזה
// דרך repository/db.ts.
import { createClient } from '@supabase/supabase-js'
import type {
  AppDB,
  ContentDayRow,
  DailyTriggerRow,
  MessageDeliveryRow,
  MessageRow,
  ParticipantRow,
} from './interface'

export function createSupabaseDb(url: string, key: string): AppDB {
  const supabase = createClient(url, key)

  async function insertAndReturn<T>(
    table: string,
    values: Record<string, unknown>,
  ): Promise<T> {
    const { data, error } = await supabase.from(table).insert(values).select().single()
    if (error) throw new Error(`[supabase] ${table}: ${error.message}`)
    return data as T
  }

  async function updateRow(table: string, id: string, values: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.from(table).update(values).eq('id', id)
    if (error) throw new Error(`[supabase] ${table}: ${error.message}`)
  }

  return {
    async ping() {
      await supabase.from('participants').select('id').limit(1)
    },

    async createParticipant(input) {
      return insertAndReturn<ParticipantRow>('participants', {
        full_name: input.fullName,
        phone: input.phone,
        signup_source_ref: input.signupSourceRef,
        signup_at: input.signupAt,
        day1_date: input.day1Date,
      })
    },

    async getParticipant(id) {
      const { data } = await supabase.from('participants').select().eq('id', id).maybeSingle()
      return data ?? undefined
    },

    async findParticipantByPhone(phone) {
      const { data } = await supabase.from('participants').select().eq('phone', phone).maybeSingle()
      return data ?? undefined
    },

    async getActiveParticipants() {
      const { data, error } = await supabase.from('participants').select().eq('status', 'active')
      if (error) throw new Error(`[supabase] participants: ${error.message}`)
      return data ?? []
    },

    async markParticipantCompleted(id) {
      await updateRow('participants', id, { status: 'completed' })
    },

    async createContentDay(input) {
      return insertAndReturn<ContentDayRow>('content_days', { day_number: input.dayNumber, title: input.title })
    },

    async getContentDay(dayNumber) {
      const { data } = await supabase.from('content_days').select().eq('day_number', dayNumber).maybeSingle()
      return data ?? undefined
    },

    async getMaxContentDayNumber() {
      const { data } = await supabase
        .from('content_days')
        .select('day_number')
        .order('day_number', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data?.day_number ?? 0
    },

    async createMessage(input) {
      return insertAndReturn<MessageRow>('messages', {
        content_day_number: input.contentDayNumber,
        send_offset_time: input.sendOffsetTime,
        order_in_day: input.orderInDay,
        body_text: input.bodyText,
        media_url: input.mediaUrl,
        media_type: input.mediaType,
      })
    },

    async getMessage(id) {
      const { data } = await supabase.from('messages').select().eq('id', id).maybeSingle()
      return data ?? undefined
    },

    async getMessagesForContentDay(dayNumber) {
      const { data, error } = await supabase
        .from('messages')
        .select()
        .eq('content_day_number', dayNumber)
        .order('order_in_day', { ascending: true })
      if (error) throw new Error(`[supabase] messages: ${error.message}`)
      return data ?? []
    },

    async createDailyTrigger(input) {
      return insertAndReturn<DailyTriggerRow>('daily_triggers', {
        participant_id: input.participantId,
        calendar_date: input.calendarDate,
        content_day_number: input.contentDayNumber,
      })
    },

    async findDailyTrigger(participantId, calendarDate) {
      const { data } = await supabase
        .from('daily_triggers')
        .select()
        .eq('participant_id', participantId)
        .eq('calendar_date', calendarDate)
        .maybeSingle()
      return data ?? undefined
    },

    async getDailyTrigger(id) {
      const { data } = await supabase.from('daily_triggers').select().eq('id', id).maybeSingle()
      return data ?? undefined
    },

    async getUnsentDailyTriggers(calendarDate) {
      const { data, error } = await supabase
        .from('daily_triggers')
        .select()
        .eq('calendar_date', calendarDate)
        .is('trigger_sent_at', null)
      if (error) throw new Error(`[supabase] daily_triggers: ${error.message}`)
      return data ?? []
    },

    async markDailyTriggerSent(id, sentAt) {
      await updateRow('daily_triggers', id, { trigger_sent_at: sentAt })
    },

    async markDailyTriggerClicked(id, clickedAt) {
      await updateRow('daily_triggers', id, { clicked_at: clickedAt })
    },

    async createMessageDelivery(input) {
      return insertAndReturn<MessageDeliveryRow>('message_deliveries', {
        participant_id: input.participantId,
        message_id: input.messageId,
        daily_trigger_id: input.dailyTriggerId,
        scheduled_for: input.scheduledFor,
      })
    },

    async getPendingDeliveriesForTrigger(dailyTriggerId, upTo) {
      const { data, error } = await supabase
        .from('message_deliveries')
        .select()
        .eq('daily_trigger_id', dailyTriggerId)
        .eq('status', 'pending')
        .lte('scheduled_for', upTo)
      if (error) throw new Error(`[supabase] message_deliveries: ${error.message}`)
      return data ?? []
    },

    async getDuePendingDeliveriesWithClickedTrigger(now) {
      const { data, error } = await supabase
        .from('message_deliveries')
        .select('*, daily_triggers!inner(clicked_at)')
        .eq('status', 'pending')
        .lte('scheduled_for', now)
        .not('daily_triggers.clicked_at', 'is', null)
      if (error) throw new Error(`[supabase] message_deliveries: ${error.message}`)
      return (data ?? []) as MessageDeliveryRow[]
    },

    async markDeliverySent(id, sentAt) {
      await updateRow('message_deliveries', id, { status: 'sent', sent_at: sentAt })
    },

    async openOrExtendSessionWindow(participantId, expiresAt) {
      const { error } = await supabase
        .from('session_windows')
        .upsert(
          { participant_id: participantId, opened_at: new Date().toISOString(), expires_at: expiresAt },
          { onConflict: 'participant_id' },
        )
      if (error) throw new Error(`[supabase] session_windows: ${error.message}`)
    },

    async isSessionWindowOpen(participantId, now) {
      const { data } = await supabase
        .from('session_windows')
        .select('expires_at')
        .eq('participant_id', participantId)
        .maybeSingle()
      return !!data && data.expires_at > now
    },
  }
}
```

- [ ] **Step 3: Create the smoke test `src/repository/supabase-impl.smoke.test.ts`**

```ts
// בדיקת עשן אמיתית מול Supabase — רצה רק כש-SUPABASE_URL/SUPABASE_SERVICE_KEY מוגדרים
// בסביבה. לפני שהיא תעבור: הרץ את migrations/0001_init.sql על פרויקט Supabase ריק.
import { describe, expect, it } from 'vitest'
import { createSupabaseDb } from './supabase-impl'

const hasSupabaseEnv = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY

describe.skipIf(!hasSupabaseEnv)('createSupabaseDb (smoke test מול Supabase אמיתי)', () => {
  it('יוצר נרשם אמיתי ומוצא אותו לפי טלפון', async () => {
    const db = createSupabaseDb(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
    const uniquePhone = `+972500${Date.now().toString().slice(-6)}`
    const created = await db.createParticipant({
      fullName: 'בדיקת עשן',
      phone: uniquePhone,
      signupSourceRef: null,
      signupAt: new Date().toISOString(),
      day1Date: '2099-01-01',
    })
    expect(created.id).toBeTruthy()

    const found = await db.findParticipantByPhone(uniquePhone)
    expect(found?.id).toBe(created.id)
  })
})
```

- [ ] **Step 4: Run the full suite**

```bash
cd hachamama-parenting-program/server
npx vitest run
```

Expected: PASS — the smoke test shows as **skipped** (no `SUPABASE_URL` set locally), everything else PASS.

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/server/migrations hachamama-parenting-program/server/src/repository
git commit -m "feat(hachamama): add Supabase schema migration and real repository implementation"
```

---

### Task 14: Wire real dependencies in `index.ts` + typecheck + README

**Files:**
- Modify: `hachamama-parenting-program/server/src/index.ts`
- Create: `hachamama-parenting-program/server/README.md`

- [ ] **Step 1: Update `src/index.ts`** to wire the real `db` and `makeClient`

```ts
import { serve } from '@hono/node-server'
import { createApp } from './app'
import { env } from './env'
import { createMakeClient } from './make/client'
import { createDb } from './repository/db'

const db = await createDb(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
const makeClient = createMakeClient(env.MAKE_WEBHOOK_URL ?? '')

const app = createApp({ db, makeClient, env })

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`🚀 Hachamama server — http://localhost:${info.port}`)
})
```

- [ ] **Step 2: Run typecheck**

```bash
cd hachamama-parenting-program/server
npm run typecheck
```

Expected: no errors. If `top-level await` raises a target error, confirm `tsconfig.json`'s `"target": "ES2023"` and `"module": "ESNext"` are in place (Step 2 of Task 1) — both already support it.

- [ ] **Step 3: Create `README.md`** at `hachamama-parenting-program/server/README.md`

```markdown
# Hachamama Server — Core Engine (Plan A)

השרת שמריץ את מנוע התזמון (day1_date, ריצה יומית JIT) ואת השילוב עם Make.com/WhatsApp.
ראו `hachamama-parenting-program/docs/2026-07-31-design.md` לתיאור המלא.

## הרצה בפיתוח

\`\`\`bash
npm install
npm run dev
\`\`\`

בלי `.env` — משתמש ב-in-memory DB (נמחק בכל restart) ובלי Make אמיתי מוגדר.
ל-webhooks יש secrets ברירת מחדל לפיתוח (`dev-secret-change-me`) — לעולם לא בפרודקשן.

## בדיקות

\`\`\`bash
npm test
\`\`\`

## חיבור ל-Supabase אמיתי

1. ליצור פרויקט Supabase חדש.
2. להריץ את `migrations/0001_init.sql` (SQL editor או `supabase db push`).
3. להגדיר ב-`.env`: `SUPABASE_URL` ו-`SUPABASE_SERVICE_KEY` (מתוך Project Settings → API).
4. `npm test` ירוץ עכשיו גם על ה-smoke test מול Supabase אמיתי, לא רק in-memory.

## Endpoints

| Method | Path | הגנה | תפקיד |
|---|---|---|---|
| GET | `/api/health` | — | health check |
| POST | `/api/webhooks/signup` | `Authorization: Bearer $SIGNUP_WEBHOOK_SECRET` | יוצר נרשם חדש, מחשב day1_date |
| POST | `/api/webhooks/make/button-click` | `Authorization: Bearer $MAKE_WEBHOOK_SECRET` | Make מעביר לחיצת כפתור; מחזיר הודעות לשליחה מיידית |
| POST | `/api/cron/generate-daily` | `Authorization: Bearer $CRON_SECRET` | ריצה יומית — ליצור בסביבת production ב-00:05 שעון ישראל |
| POST | `/api/cron/send-triggers` | `Authorization: Bearer $CRON_SECRET` | שליחת הודעות טריגר בוקר — לתזמן קצת אחרי generate-daily |
| POST | `/api/cron/drip` | `Authorization: Bearer $CRON_SECRET` | שליחה בזמן אמת — לתזמן כל 5 דקות |

תזמון בפועל (Vercel Cron / OS cron / כל scheduler אחר) הוא החלטת פריסה, לא חלק מהקוד הזה.
```

- [ ] **Step 4: Run the full test suite once more to confirm nothing broke**

```bash
cd hachamama-parenting-program/server
npm test
npm run typecheck
```

Expected: all PASS, no typecheck errors.

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/server/src/index.ts hachamama-parenting-program/server/README.md
git commit -m "feat(hachamama): wire real db/makeClient dependencies and document endpoints"
```

- [ ] **Step 6: Update the top-level project README** to point at the server

Modify `hachamama-parenting-program/README.md`, replacing the "מצב נוכחי" section:

```markdown
## מצב נוכחי

Plan A (הליבה: DB + מנוע תזמון + שילוב Make) מומש ונבדק — ראו `server/README.md`.
Plans B (ניהול תוכן), C (שאלונים), D (דשבורד מנחות) טרם החלו.
```

- [ ] **Step 7: Commit**

```bash
git add "hachamama-parenting-program/README.md"
git commit -m "docs(hachamama): note Plan A completion in project README"
```

---

## Self-Review Notes

**Spec coverage:** signup webhook + day1_date ✅ (Task 11/2), JIT daily generation + content-edit-applies-going-forward ✅ (Task 8, reads content live), per-day button payload + independent release + accumulate-until-clicked ✅ (Tasks 9-11), real-time drip within an open session window ✅ (Task 10), Supabase schema matching the design doc's data model ✅ (Task 13). Out of scope by design: forms/questionnaires, mentor dashboard, admin content UI — Plans B/C/D.

**Type consistency:** `AppDB` defined once in Task 3 and never changed afterward; every job/route imports it from `repository/interface` and uses the exact same field names (`day1_date`, `daily_trigger_id`, etc.) throughout Tasks 4-13.

**No placeholders:** the only `throw new Error('not implemented yet — Task N')` stubs are intentional TDD stepping stones within Task 3, replaced by Tasks 4-5 of this same plan — not indefinite TODOs.
