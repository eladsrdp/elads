# Video Submission Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single, reusable public link the project owner sends to all participants. A participant types their phone number and uploads a video; mentors then see it on that participant's detail page in the mentor dashboard.

**Architecture:** A new public (unauthenticated) HTML form page + POST handler in the existing `hachamama-parenting-program/server/` Hono app — **not** the `mentor-dashboard/` Next.js app, because the phone-to-participant lookup requires reading `participants`, and `mentor-dashboard` only has anon-key+RLS access (which has no public read policy on `participants`, by design — Plan D deliberately restricts that to mentors only). The Hono server already has service-role DB access and already serves other public unauthenticated-but-validated endpoints (webhooks) — this fits that exact pattern, just serving HTML instead of JSON.

Flow: participant opens the link → plain HTML form (phone + file input) → POST → server looks up the participant by phone (reusing existing `findParticipantByPhone`) → if not found, show a plain error page → if found, validate the file is a video and under a size limit, upload it to the existing Supabase Storage `media` bucket, insert a row into a new `video_submissions` table, show a plain success page. Mentors see submissions on `/participants/[id]` in `mentor-dashboard/` (new RLS SELECT policy lets mentors read `video_submissions` directly, same pattern as Plan D's other read-only mentor access).

**Tech Stack:** Plain HTML forms served via Hono's `c.html()` (no client-side JS needed — this is intentionally as simple as the rest of `server/`), `multipart/form-data` parsing via Hono's built-in `c.req.parseBody()`, existing `AppDB`/Supabase patterns.

---

## File Structure

```
hachamama-parenting-program/
  server/
    migrations/
      0004_video_submissions.sql       # NEW — table + mentor SELECT RLS policy
    src/
      storage/
        video-storage.ts               # NEW — VideoStorage interface + Supabase impl + fake
      repository/
        interface.ts                   # MODIFY — add createVideoSubmission to AppDB
        local-impl.ts                  # MODIFY — implement it
        supabase-impl.ts               # MODIFY — implement it
      routes/
        video-submission.ts            # NEW — GET form page, POST handler
        video-submission.test.ts       # NEW
      context.ts                       # MODIFY — add videoStorage to AppContext
      app.ts                           # MODIFY — mount the new route
      index.ts, api/index.ts           # MODIFY — wire real videoStorage
  mentor-dashboard/
    src/
      lib/
        mentor-data-source.ts          # MODIFY — add getVideoSubmissions
        mentor-view.ts                 # MODIFY — include videoSubmissions in ParticipantDetailView
        mentor-view.test.ts            # MODIFY — cover the new field
      app/participants/[id]/page.tsx   # MODIFY — render a video-submissions section
```

---

## Task 1: Migration — `video_submissions` table + mentor read RLS

**Files:**
- Create: `hachamama-parenting-program/server/migrations/0004_video_submissions.sql`

- [ ] **Step 1: Write the migration**

```sql
-- hachamama-parenting-program/server/migrations/0004_video_submissions.sql
-- טבלת סרטונים שנרשמים מעלים בעצמם דרך לינק ציבורי רב-פעמי (POST /video-submit,
-- מוגש ע"י server/ עם service role — לא ע"י mentor-dashboard/, ראו הערת ארכיטקטורה
-- בתוכנית). RLS מופעל בלי policy כתיבה בכוונה — רק ה-server (service role, עוקף RLS)
-- כותב כאן; מנחות מקבלות SELECT בלבד, תואם ל-Plan D.
create table video_submissions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id),
  video_url text not null,
  submitted_at timestamptz not null default now()
);

alter table video_submissions enable row level security;

create policy video_submissions_select_mentor on video_submissions
  for select to authenticated
  using (exists (select 1 from mentors where user_id = auth.uid()));
```

- [ ] **Step 2: Run it against the real Supabase project, then verify**

Same manual process as prior migrations (SQL editor on the real project). Verify with:
```sql
select policyname from pg_policies where tablename = 'video_submissions';
```
Expected: `video_submissions_select_mentor`.

- [ ] **Step 3: Commit**

```bash
git add hachamama-parenting-program/server/migrations/0004_video_submissions.sql
git commit -m "feat(hachamama): add video_submissions table with mentor read RLS"
```

---

## Task 2: `VideoStorage` — interface + Supabase impl + fake

**Files:**
- Create: `hachamama-parenting-program/server/src/storage/video-storage.ts`
- Test: `hachamama-parenting-program/server/src/storage/video-storage.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// hachamama-parenting-program/server/src/storage/video-storage.test.ts
import { describe, expect, it } from 'vitest'
import { createFakeVideoStorage } from './video-storage.js'

describe('createFakeVideoStorage', () => {
  it('רושם קבצים שהועלו ומחזיר URL ציבורי מדומה, בלי HTTP אמיתי', async () => {
    const storage = createFakeVideoStorage()
    const url = await storage.upload(new Uint8Array([1, 2, 3]), 'clip.mp4', 'video/mp4')

    expect(url).toMatch(/^https:\/\/fake-storage\.test\//)
    expect(storage.uploaded).toHaveLength(1)
    expect(storage.uploaded[0].filename).toBe('clip.mp4')
    expect(storage.uploaded[0].contentType).toBe('video/mp4')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd hachamama-parenting-program/server
npx vitest run src/storage/video-storage.test.ts
```

Expected: FAIL — `Cannot find module './video-storage.js'`.

- [ ] **Step 3: Write the implementation**

```ts
// hachamama-parenting-program/server/src/storage/video-storage.ts
// אחסון סרטוני הגשה — Supabase Storage אמיתי בפרודקשן, fake test double בבדיקות
// (אין local-impl בסגנון AppDB כאן כי אין דרך פשוטה "לדמות" אחסון קבצים מקומי;
// ה-fake רק רושם מה הועלה, כמו FakeMakeClient).
import { createClient } from '@supabase/supabase-js'

export interface VideoStorage {
  upload(bytes: Uint8Array, filename: string, contentType: string): Promise<string>
}

export function createSupabaseVideoStorage(supabaseUrl: string, serviceKey: string): VideoStorage {
  const supabase = createClient(supabaseUrl, serviceKey)
  return {
    async upload(bytes, filename, contentType) {
      const path = `video-submissions/${crypto.randomUUID()}-${filename}`
      const { error } = await supabase.storage.from('media').upload(path, bytes, { contentType })
      if (error) throw error
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      return data.publicUrl
    },
  }
}

export interface FakeVideoStorage extends VideoStorage {
  uploaded: Array<{ filename: string; contentType: string; bytes: Uint8Array }>
}

export function createFakeVideoStorage(): FakeVideoStorage {
  const uploaded: FakeVideoStorage['uploaded'] = []
  return {
    uploaded,
    async upload(bytes, filename, contentType) {
      uploaded.push({ filename, contentType, bytes })
      return `https://fake-storage.test/${filename}`
    },
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npx vitest run src/storage/video-storage.test.ts
```

Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/server/src/storage/video-storage.ts hachamama-parenting-program/server/src/storage/video-storage.test.ts
git commit -m "feat(hachamama): add VideoStorage with Supabase impl and fake test double"
```

---

## Task 3: `AppDB.createVideoSubmission` (interface + both implementations)

**Files:**
- Modify: `hachamama-parenting-program/server/src/repository/interface.ts`
- Modify: `hachamama-parenting-program/server/src/repository/local-impl.ts`
- Modify: `hachamama-parenting-program/server/src/repository/supabase-impl.ts`

- [ ] **Step 1: Add to `interface.ts`**

Add this type near the other Row types:

```ts
export interface VideoSubmissionRow {
  id: string
  participant_id: string
  video_url: string
  submitted_at: string
}
```

Add this method to the `AppDB` interface (near the other participant-related methods):

```ts
  createVideoSubmission(input: { participantId: string; videoUrl: string }): Promise<VideoSubmissionRow>
```

- [ ] **Step 2: Implement in `local-impl.ts`**

Follow the exact same pattern as the nearest existing `create*` method in this file (in-memory `Map`, `crypto.randomUUID()` for `id`, `new Date().toISOString()` for `submitted_at`). Read the file first to match its existing style exactly (variable naming for the maps, whether it uses a shared `nextId`/`randomUUID` helper, etc.) — don't guess, match what's already there.

- [ ] **Step 3: Implement in `supabase-impl.ts`**

Same instruction — read the file first, match the existing `create*` method pattern exactly (the shared error-throwing helper this file uses, the `.select().single()` pattern, snake_case column mapping).

- [ ] **Step 4: Run the existing test suite to confirm nothing broke**

```bash
cd hachamama-parenting-program/server
npx vitest run
```

Expected: all existing tests still pass (this task adds a method, doesn't change existing behavior — no new test file needed here, `video-submission.test.ts` in Task 4 exercises this through the route).

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add hachamama-parenting-program/server/src/repository/interface.ts hachamama-parenting-program/server/src/repository/local-impl.ts hachamama-parenting-program/server/src/repository/supabase-impl.ts
git commit -m "feat(hachamama): add createVideoSubmission to AppDB"
```

---

## Task 4: Route — public video-submission form + handler

**Files:**
- Modify: `hachamama-parenting-program/server/src/context.ts`
- Create: `hachamama-parenting-program/server/src/routes/video-submission.ts`
- Test: `hachamama-parenting-program/server/src/routes/video-submission.test.ts`
- Modify: `hachamama-parenting-program/server/src/app.ts`

- [ ] **Step 1: Add `videoStorage` to `AppContext`**

In `src/context.ts`, add the import and field:

```ts
import type { VideoStorage } from './storage/video-storage.js'
```

and add `videoStorage: VideoStorage` to the `AppContext` interface.

- [ ] **Step 2: Write the failing test**

```ts
// hachamama-parenting-program/server/src/routes/video-submission.test.ts
import { describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { env } from '../env.js'
import { createFakeMakeClient } from '../make/client.js'
import { createLocalDb } from '../repository/local-impl.js'
import { createFakeVideoStorage } from '../storage/video-storage.js'

describe('GET /video-submit', () => {
  it('מחזיר עמוד HTML עם שדה טלפון וקלט קובץ', async () => {
    const app = createApp({ db: createLocalDb(), makeClient: createFakeMakeClient(), videoStorage: createFakeVideoStorage(), env })
    const res = await app.request('/video-submit')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('type="tel"')
    expect(html).toContain('type="file"')
  })
})

describe('POST /video-submit', () => {
  it('מספר טלפון לא מוכר מחזיר עמוד שגיאה, בלי להעלות כלום', async () => {
    const videoStorage = createFakeVideoStorage()
    const app = createApp({ db: createLocalDb(), makeClient: createFakeMakeClient(), videoStorage, env })

    const form = new FormData()
    form.set('phone', '+972500000099')
    form.set('video', new File([new Uint8Array([1, 2, 3])], 'clip.mp4', { type: 'video/mp4' }))

    const res = await app.request('/video-submit', { method: 'POST', body: form })

    expect(res.status).toBe(404)
    expect(videoStorage.uploaded).toHaveLength(0)
  })

  it('מספר טלפון מוכר + סרטון תקין: מעלה, שומר ב-DB, מחזיר עמוד הצלחה', async () => {
    const db = createLocalDb()
    const participant = await db.createParticipant({
      fullName: 'ישראל ישראלי',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2026-08-04T10:00:00.000Z',
      day1Date: '2026-08-09',
    })
    const videoStorage = createFakeVideoStorage()
    const app = createApp({ db, makeClient: createFakeMakeClient(), videoStorage, env })

    const form = new FormData()
    form.set('phone', '0501234567') // פורמט מקומי, לא E.164 — הראוט צריך לנרמל
    form.set('video', new File([new Uint8Array([1, 2, 3])], 'clip.mp4', { type: 'video/mp4' }))

    const res = await app.request('/video-submit', { method: 'POST', body: form })

    expect(res.status).toBe(200)
    expect(videoStorage.uploaded).toHaveLength(1)
    const html = await res.text()
    expect(html).toContain('התקבל')

    void participant
  })

  it('דוחה קובץ שאינו וידאו, בלי להעלות', async () => {
    const db = createLocalDb()
    await db.createParticipant({
      fullName: 'ישראל',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2026-08-04T10:00:00.000Z',
      day1Date: '2026-08-09',
    })
    const videoStorage = createFakeVideoStorage()
    const app = createApp({ db, makeClient: createFakeMakeClient(), videoStorage, env })

    const form = new FormData()
    form.set('phone', '+972501234567')
    form.set('video', new File([new Uint8Array([1, 2, 3])], 'not-a-video.exe', { type: 'application/x-msdownload' }))

    const res = await app.request('/video-submit', { method: 'POST', body: form })

    expect(res.status).toBe(400)
    expect(videoStorage.uploaded).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

```bash
cd hachamama-parenting-program/server
npx vitest run src/routes/video-submission.test.ts
```

Expected: FAIL — route doesn't exist yet (404s / import errors, since `createApp` doesn't accept `videoStorage` yet either).

- [ ] **Step 4: Write the route**

```ts
// hachamama-parenting-program/server/src/routes/video-submission.ts
// לינק ציבורי רב-פעמי — נרשם מקליד טלפון ומעלה סרטון, בלי login. אין secret/header
// כאן בכוונה (בשונה מ-webhooks.ts) כי זה מיועד לאדם אמיתי בדפדפן, לא למערכת חיצונית —
// אימות ה"זהות" היחיד הוא התאמת מספר הטלפון לנרשם קיים.
import { Hono } from 'hono'
import type { AppContext } from '../context.js'

const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024 // 100MB — סרטון קצר מהטלפון, לא ל-YouTube
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm'])

function phoneDigitsOnly(phone: string): string {
  return phone.replace(/\D/g, '')
}

const FORM_PAGE_HTML = `<!doctype html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><title>העלאת סרטון</title></head>
<body style="font-family: sans-serif; max-width: 400px; margin: 60px auto;">
  <h1>העלאת סרטון</h1>
  <form method="post" enctype="multipart/form-data">
    <label>מספר טלפון<br>
      <input type="tel" name="phone" required style="width: 100%; margin: 8px 0;">
    </label>
    <br>
    <label>קובץ סרטון<br>
      <input type="file" name="video" accept="video/*" required style="margin: 8px 0;">
    </label>
    <br>
    <button type="submit">שלח</button>
  </form>
</body>
</html>`

function errorPage(message: string): string {
  return `<!doctype html>
<html lang="he" dir="rtl"><body style="font-family: sans-serif; max-width: 400px; margin: 60px auto;">
<h1>שגיאה</h1><p>${message}</p>
</body></html>`
}

const SUCCESS_PAGE_HTML = `<!doctype html>
<html lang="he" dir="rtl"><body style="font-family: sans-serif; max-width: 400px; margin: 60px auto;">
<h1>התקבל!</h1><p>הסרטון הועלה בהצלחה.</p>
</body></html>`

export function createVideoSubmissionRoutes(ctx: AppContext) {
  const app = new Hono()

  app.get('/video-submit', (c) => c.html(FORM_PAGE_HTML))

  app.post('/video-submit', async (c) => {
    const body = await c.req.parseBody()
    const phone = body.phone
    const video = body.video

    if (typeof phone !== 'string' || !phone) {
      return c.html(errorPage('יש להזין מספר טלפון'), 400)
    }
    if (!(video instanceof File)) {
      return c.html(errorPage('יש לבחור קובץ סרטון'), 400)
    }
    if (!ALLOWED_VIDEO_TYPES.has(video.type)) {
      return c.html(errorPage('סוג הקובץ אינו נתמך — יש להעלות סרטון (mp4/mov/webm)'), 400)
    }
    if (video.size > MAX_VIDEO_SIZE_BYTES) {
      return c.html(errorPage(`הקובץ גדול מ-${MAX_VIDEO_SIZE_BYTES / (1024 * 1024)}MB`), 400)
    }

    const participants = await ctx.db.getActiveParticipants()
    const participant = participants.find((p) => phoneDigitsOnly(p.phone) === phoneDigitsOnly(phone))
    if (!participant) {
      return c.html(errorPage('מספר הטלפון לא נמצא — בדוק/י שהוקלד נכון'), 404)
    }

    const bytes = new Uint8Array(await video.arrayBuffer())
    const videoUrl = await ctx.videoStorage.upload(bytes, video.name, video.type)
    await ctx.db.createVideoSubmission({ participantId: participant.id, videoUrl })

    return c.html(SUCCESS_PAGE_HTML)
  })

  return app
}
```

Note: `getActiveParticipants()` + linear phone-digit match is used instead of a new `findParticipantByPhoneDigitsOnly` DB method — this mirrors the exact normalization approach already used in `webhooks.ts`'s button-click handler (`phoneDigitsOnly` comparison), and participant counts here are in the dozens-to-low-hundreds (see design doc "היקף"), so an in-memory scan is fine — no need for a DB-level query variant.

- [ ] **Step 5: Wire into `app.ts`**

```ts
import { createVideoSubmissionRoutes } from './routes/video-submission.js'
```

and add:

```ts
app.route('/', createVideoSubmissionRoutes(ctx))
```

(mount at root, not under `/api`, so the link is a clean `https://hahamama.vercel.app/video-submit` — not `/api/video-submit`. Check `vercel.json`'s rewrite rule `{ "source": "/(.*)", "destination": "/api" }` still routes this correctly since everything already goes through the single `api/index.ts` handler regardless of path.)

- [ ] **Step 6: Run tests, verify all pass**

```bash
cd hachamama-parenting-program/server
npx vitest run
```

Expected: all pass, including the new `video-submission.test.ts` (4 tests).

- [ ] **Step 7: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors (this will surface any remaining `createApp`/`AppContext` call sites across the codebase — e.g. `api/index.ts`, `src/index.ts` — that need the new `videoStorage` argument; fix them now using `createSupabaseVideoStorage(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)`, matching how `makeClient` is already wired there).

- [ ] **Step 8: Commit**

```bash
git add hachamama-parenting-program/server/src/context.ts hachamama-parenting-program/server/src/routes/video-submission.ts hachamama-parenting-program/server/src/routes/video-submission.test.ts hachamama-parenting-program/server/src/app.ts hachamama-parenting-program/server/api/index.ts hachamama-parenting-program/server/src/index.ts
git commit -m "feat(hachamama): add public video-submission link (form + handler)"
```

---

## Task 5: Mentor dashboard — show video submissions on participant detail

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/lib/mentor-data-source.ts`
- Modify: `hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.ts`
- Modify: `hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.test.ts`
- Modify: `hachamama-parenting-program/mentor-dashboard/src/app/participants/[id]/page.tsx`

- [ ] **Step 1: Add to `mentor-data-source.ts`**

Add a `VideoSubmissionRecord` type and a `getVideoSubmissionsForParticipant` method to the `MentorDataSource` interface and its Supabase implementation, following the exact same pattern already used for `getDeliveriesForParticipant` in this same file (read the file first, match its style — `.from().select().eq().order()`, error-throw-on-failure).

```ts
export interface VideoSubmissionRecord {
  id: string
  video_url: string
  submitted_at: string
}
```

```ts
    async getVideoSubmissionsForParticipant(participantId) {
      const { data, error } = await supabase
        .from('video_submissions')
        .select('id, video_url, submitted_at')
        .eq('participant_id', participantId)
        .order('submitted_at', { ascending: false })
      if (error) throw error
      return data as VideoSubmissionRecord[]
    },
```

(add `getVideoSubmissionsForParticipant(participantId: string): Promise<VideoSubmissionRecord[]>` to the `MentorDataSource` interface too)

- [ ] **Step 2: Update `mentor-view.ts`**

Add `videoSubmissions: { id: string; videoUrl: string; submittedAt: string }[]` to `ParticipantDetailView`, and populate it in `buildParticipantDetail` by calling the new data-source method (alongside the existing `getDeliveriesForParticipant` call — use `Promise.all` for both).

- [ ] **Step 3: Update `mentor-view.test.ts`**

Add a fake `getVideoSubmissionsForParticipant` to the `fakeDataSource` helper (default `async () => []`), and extend the existing "מחזיר פרטי מנוי + היסטוריית הודעות" test (or add a new one) to also assert on `videoSubmissions` when the fake returns a submission.

- [ ] **Step 4: Run tests**

```bash
cd hachamama-parenting-program/mentor-dashboard
npx vitest run
```

- [ ] **Step 5: Update `src/app/participants/[id]/page.tsx`**

Add a section after the existing delivery-history table:

```tsx
{detail.videoSubmissions.length > 0 && (
  <>
    <h2>סרטונים שהועלו</h2>
    <ul>
      {detail.videoSubmissions.map((v) => (
        <li key={v.id}>
          <a href={v.videoUrl} target="_blank" rel="noreferrer">
            צפייה בסרטון
          </a>
          {' — '}
          {v.submittedAt}
        </li>
      ))}
    </ul>
  </>
)}
```

- [ ] **Step 6: Typecheck + build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/lib/mentor-data-source.ts hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.ts hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.test.ts hachamama-parenting-program/mentor-dashboard/src/app/participants/[id]/page.tsx
git commit -m "feat(mentor-dashboard): show video submissions on participant detail page"
```

---

## Task 6: Final review + docs

**Files:**
- Modify: `hachamama-parenting-program/server/README.md`

- [ ] **Step 1: Add an endpoint row + section to `server/README.md`**

In the endpoints table, add:

```markdown
| GET/POST | `/video-submit` | — (ציבורי, ללא הגנה — אימות רק לפי התאמת טלפון) | לינק להעלאת סרטון ע"י נרשם |
```

Add a short section:

```markdown
## לינק העלאת סרטון (`/video-submit`)

לינק ציבורי רב-פעמי — לשלוח לכל הנרשמים. נרשם מקליד טלפון ומעלה סרטון; אם הטלפון
תואם נרשם פעיל, הסרטון נשמר ל-Supabase Storage (`media` bucket) ונרשם ב-`video_submissions`.
מנחות רואות את הסרטונים במסך פרטי הנרשם ב-`mentor-dashboard/` (`/participants/[id]`).

**⚠️ אין הגנה חוץ מהתאמת טלפון** — כל מי שיודע טלפון נרשם קיים יכול "להעלות בשמו".
מתאים לקהילה סגורה קטנה; לא מיועד לפרסום ציבורי רחב.
```

- [ ] **Step 2: Full verification across both apps**

```bash
cd hachamama-parenting-program/server
npx vitest run
npx tsc --noEmit

cd ../mentor-dashboard
npx vitest run
npx tsc --noEmit
npm run build
```

Expected: everything green.

- [ ] **Step 3: Commit + push**

```bash
git add hachamama-parenting-program/server/README.md
git commit -m "docs(hachamama): document the public video-submission link"
git push origin main
```

- [ ] **Step 4: Report the actual link to the user**

`https://hahamama.vercel.app/video-submit` — confirm this resolves once deployed (Vercel auto-deploys on push to `main`).
