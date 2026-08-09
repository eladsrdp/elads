# Mentor Dashboard — Week Number + Brand Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the program week alongside each day in the content table, and apply the "החממה" brand palette + logo across every screen in `mentor-dashboard/` (today only `/video-submit` is branded — the other 5 pages are unstyled default HTML).

**Architecture:** Extract the color tokens + logo URL already used ad-hoc in `video-submit/page.tsx` into one shared module (`src/lib/brand.ts`) plus a composed "single-card page" style object (`src/lib/auth-card-styles.ts`) for the three standalone form screens (login, reset-password, mentors/new). Introduce one shared `<DashboardHeader>` component (logo + nav + sign-out) to replace the header markup currently duplicated between `participants/page.tsx` and `content/page.tsx`, and add it to `mentors/new/page.tsx` too for consistent navigation. Add a small pure `calculateWeekNumber` helper next to the existing pure date helpers in `program-day.ts`.

**Tech Stack:** Next.js 15 (App Router, Server Components + Server Actions), React 19, TypeScript, Vitest. No CSS framework in this app today (confirmed: zero `.css` files) — styling stays inline-style objects, matching the existing convention. This plan does not introduce Tailwind or any new dependency.

**Explicit scope decision:** small icon-only action buttons (✎ edit, 🗑 delete, ⤢ expand, ✕ close) keep their default browser styling except for color — this plan does not redesign icon buttons, only applies brand color/typography to text, primary actions, borders, and backgrounds. The user asked for brand colors + logo, not a full visual redesign.

---

### Task 1: `calculateWeekNumber` pure helper

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/lib/program-day.ts`
- Test: `hachamama-parenting-program/mentor-dashboard/src/lib/program-day.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `program-day.test.ts` (new import + new `describe` block):

```ts
import { describe, expect, it } from 'vitest'
import { calculateDay1Date, calculateProgramDayNumber, calculateWeekNumber, getIsraelDateString } from './program-day'
```

```ts
describe('calculateWeekNumber', () => {
  it('ימים 1-7 הם שבוע 1', () => {
    expect(calculateWeekNumber(1)).toBe(1)
    expect(calculateWeekNumber(7)).toBe(1)
  })

  it('יום 8 הוא תחילת שבוע 2', () => {
    expect(calculateWeekNumber(8)).toBe(2)
  })

  it('יום 26 (סוף שבוע 4) הוא שבוע 4', () => {
    expect(calculateWeekNumber(26)).toBe(4)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm test -- program-day`
Expected: FAIL — `calculateWeekNumber is not a function` / import error.

- [ ] **Step 3: Implement**

Add to `program-day.ts` (end of file):

```ts
/** באיזה שבוע בתוכנית (1-based) נמצא יום נתון — כל שבוע הוא 7 ימים, יום 1 הוא תמיד יום ראשון. */
export function calculateWeekNumber(dayNumber: number): number {
  return Math.ceil(dayNumber / 7)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm test -- program-day`
Expected: PASS, all `program-day.test.ts` cases green.

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/lib/program-day.ts hachamama-parenting-program/mentor-dashboard/src/lib/program-day.test.ts
git commit -m "feat(mentor-dashboard): add calculateWeekNumber helper"
```

---

### Task 2: Shared brand tokens + auth-card styles

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/lib/brand.ts`
- Create: `hachamama-parenting-program/mentor-dashboard/src/lib/auth-card-styles.ts`

- [ ] **Step 1: Create `brand.ts`**

```ts
// hachamama-parenting-program/mentor-dashboard/src/lib/brand.ts
// טוקני מיתוג "החממה" — מקור אחד לצבעים+לוגו לכל האפליקציה (dashboard + video-submit).
// ה-HEX נדגם בפיקסלים מתוך brand/logo.png, ראו hachamama-parenting-program/brand/brand-guidelines.md.
export const LOGO_URL = 'https://lqhpfrhiiboshsoqnfdz.supabase.co/storage/v1/object/public/media/branding/logo-full.jpg'

export const BRAND = {
  greenDark: '#2F5F47',
  greenMuted: '#789084',
  copper: '#8B481C',
  paper: '#F3F3F3',
  white: '#FFFFFF',
  border: 'rgba(120, 144, 132, 0.3)', // גרסה שקופה של greenMuted, למסגרות עדינות בטבלאות
} as const

export const FONT_FAMILY = '-apple-system, "Segoe UI", Arial, sans-serif'

export const pageWrapperStyle = {
  maxWidth: 900,
  margin: '0 auto 40px',
  padding: '0 24px',
  fontFamily: FONT_FAMILY,
} as const

export const buttonPrimaryStyle = {
  padding: '8px 16px',
  background: BRAND.greenDark,
  color: BRAND.white,
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  cursor: 'pointer',
} as const

export const buttonSecondaryStyle = {
  padding: '6px 14px',
  background: 'transparent',
  color: BRAND.greenMuted,
  border: `1px solid ${BRAND.greenMuted}`,
  borderRadius: 8,
  fontSize: 14,
  cursor: 'pointer',
} as const

export const buttonDangerStyle = {
  padding: '6px 14px',
  background: 'transparent',
  color: BRAND.copper,
  border: `1px solid ${BRAND.copper}`,
  borderRadius: 8,
  fontSize: 14,
  cursor: 'pointer',
} as const
```

- [ ] **Step 2: Create `auth-card-styles.ts`**

```ts
// hachamama-parenting-program/mentor-dashboard/src/lib/auth-card-styles.ts
// סטיילים משותפים למסכי "כרטיס בודד" (login, reset-password, מנחה חדשה) —
// המבנה הופיע לראשונה ב-video-submit/page.tsx; הוצא לכאן כדי לא לשכפל שוב בכל מסך חדש.
import { BRAND, FONT_FAMILY } from './brand'

export const authCardStyles = {
  body: {
    fontFamily: FONT_FAMILY,
    background: BRAND.paper,
    color: BRAND.greenDark,
    minHeight: '100vh',
    margin: 0,
    padding: '48px 16px',
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    background: BRAND.white,
    borderRadius: 16,
    boxShadow: '0 2px 12px rgba(47, 95, 71, 0.12)',
    padding: '32px 24px',
    maxWidth: 360,
    width: '100%',
    textAlign: 'center' as const,
  },
  logo: { width: '100%', maxWidth: 220, height: 'auto', marginBottom: 16 },
  h1: { fontSize: 20, margin: '0 0 16px', color: BRAND.greenDark },
  tagline: { fontSize: 13, color: BRAND.greenMuted, margin: '0 0 20px' },
  label: { display: 'block', textAlign: 'right' as const, fontSize: 14, margin: '16px 0 6px', color: BRAND.greenDark },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${BRAND.greenMuted}`,
    borderRadius: 10,
    fontSize: 15,
    background: BRAND.paper,
    boxSizing: 'border-box' as const,
  },
  button: {
    width: '100%',
    marginTop: 24,
    padding: 12,
    background: BRAND.greenDark,
    color: BRAND.white,
    border: 'none',
    borderRadius: 10,
    fontSize: 16,
    cursor: 'pointer',
  },
  helperText: { fontSize: 13, color: BRAND.greenMuted, margin: '0 0 12px' },
  errorText: { color: BRAND.copper, fontSize: 14, marginTop: 12 },
  successText: { color: BRAND.greenDark, fontSize: 14, marginTop: 12 },
} as const
```

- [ ] **Step 3: Typecheck**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run typecheck`
Expected: PASS, no errors (both files are new, nothing imports them yet).

- [ ] **Step 4: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/lib/brand.ts hachamama-parenting-program/mentor-dashboard/src/lib/auth-card-styles.ts
git commit -m "feat(mentor-dashboard): add shared brand tokens and auth-card styles"
```

---

### Task 3: Week number + brand styling in the content grid

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/app/content/content-grid.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/content/content-grid.tsx
'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { createSupabaseContentDataSource } from '@/lib/content-data-source'
import { calculateWeekNumber } from '@/lib/program-day'
import { BRAND, buttonPrimaryStyle, buttonSecondaryStyle, buttonDangerStyle } from '@/lib/brand'
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
              background: BRAND.paper,
              color: BRAND.greenDark,
              fontWeight: 600,
              padding: '6px 8px',
              borderBottom: `1px solid ${BRAND.border}`,
              zIndex: 1,
            }}
          >
            יום {group.dayNumber} — שבוע {calculateWeekNumber(group.dayNumber)} {group.title ? `— ${group.title}` : ''}
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
                <button style={buttonSecondaryStyle} onClick={() => setPanelMessageId(message.id)}>
                  ⤢
                </button>
                <button style={{ ...buttonDangerStyle, marginRight: 4 }} onClick={() => handleDelete(message.id, group.dayNumber)}>
                  🗑
                </button>
              </span>
            </div>
          ))}
          <button style={{ ...buttonPrimaryStyle, margin: '4px 8px' }} onClick={() => handleAddMessage(group.dayNumber)}>
            + הודעה
          </button>
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

- [ ] **Step 2: Typecheck + unit tests**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run typecheck && npm test`
Expected: PASS (no test file targets this component directly — `content-view.test.ts` is untouched and must still pass).

- [ ] **Step 3: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/content/content-grid.tsx
git commit -m "feat(mentor-dashboard): show week number and brand colors in content grid"
```

---

### Task 4: Refactor `video-submit/page.tsx` onto the shared modules

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/app/video-submit/page.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/video-submit/page.tsx
// עיצוב לפי brand/brand-guidelines.md — כרטיס+לוגו+צבעים משותפים עם שאר האפליקציה
// (src/lib/brand.ts, src/lib/auth-card-styles.ts). מקביל ל-server/src/routes/video-submission.ts (Hono HTML).
'use client'

import { useState } from 'react'
import { submitVideo } from './actions'
import { LOGO_URL } from '@/lib/brand'
import { authCardStyles } from '@/lib/auth-card-styles'

const iconStyle = { fontSize: 40, marginBottom: 8 }

export default function VideoSubmitPage() {
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setSubmitting(true)
    const outcome = await submitVideo(formData)
    setResult(outcome.ok ? { ok: true } : { ok: false, error: outcome.error })
    setSubmitting(false)
  }

  return (
    <div style={authCardStyles.body}>
      <div style={authCardStyles.card}>
        <img style={authCardStyles.logo} src={LOGO_URL} alt="החממה" />
        {result?.ok ? (
          <>
            <div style={iconStyle}>🌱</div>
            <h1 style={authCardStyles.h1}>התקבל בהצלחה!</h1>
            <p style={authCardStyles.successText}>הסרטון שלך הועלה. תודה ששלחת!</p>
          </>
        ) : (
          <>
            <h1 style={authCardStyles.h1}>העלאת סרטון</h1>
            <p style={authCardStyles.tagline}>הדרך לגדול עם שרה גוטליב</p>
            <form action={handleSubmit}>
              <label style={authCardStyles.label} htmlFor="phone">
                מספר טלפון
              </label>
              <input style={authCardStyles.input} type="tel" id="phone" name="phone" placeholder="050-1234567" required />
              <label style={authCardStyles.label} htmlFor="video">
                קובץ סרטון
              </label>
              <input style={authCardStyles.input} type="file" id="video" name="video" accept="video/*" required />
              <button style={authCardStyles.button} type="submit" disabled={submitting}>
                {submitting ? 'שולח...' : 'שלח'}
              </button>
            </form>
            {result && !result.ok && <p style={authCardStyles.errorText}>{result.error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run build`
Expected: PASS, `/video-submit` still in the route list, no type errors.

- [ ] **Step 3: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/video-submit/page.tsx
git commit -m "refactor(mentor-dashboard): point video-submit at shared brand modules"
```

---

### Task 5: Shared `DashboardHeader` component

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/components/dashboard-header.tsx`

- [ ] **Step 1: Create the file**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/components/dashboard-header.tsx
// Header משותף לכל מסכי המנחות המחוברות (נרשמים/תכנים/מנחה חדשה) — מחליף
// header שהיה משוכפל בין participants/page.tsx ל-content/page.tsx, ומוסיף ניווט עקבי גם ל-mentors/new.
import Link from 'next/link'
import { signOut } from '@/app/login/actions'
import { BRAND, LOGO_URL, buttonSecondaryStyle } from '@/lib/brand'

const NAV_ITEMS = [
  { key: 'participants', href: '/participants', label: 'נרשמים' },
  { key: 'content', href: '/content', label: 'תכנים' },
  { key: 'mentors', href: '/mentors/new', label: 'מנחה חדשה' },
] as const

export function DashboardHeader({ active }: { active: 'participants' | 'content' | 'mentors' }) {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        background: BRAND.white,
        borderBottom: `3px solid ${BRAND.greenDark}`,
        marginBottom: 24,
      }}
    >
      <img src={LOGO_URL} alt="החממה" style={{ height: 36 }} />
      <nav style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            style={{
              color: active === item.key ? BRAND.greenDark : BRAND.greenMuted,
              fontWeight: active === item.key ? 600 : 400,
              textDecoration: 'none',
              fontSize: 15,
            }}
          >
            {item.label}
          </Link>
        ))}
        <form action={signOut}>
          <button type="submit" style={buttonSecondaryStyle}>
            התנתקות
          </button>
        </form>
      </nav>
    </header>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run typecheck`
Expected: PASS (nothing imports it yet, but it must compile standalone).

- [ ] **Step 3: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/components/dashboard-header.tsx
git commit -m "feat(mentor-dashboard): add shared DashboardHeader component"
```

---

### Task 6: `participants/page.tsx` uses `DashboardHeader`

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/app/participants/page.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/participants/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseMentorDataSource } from '@/lib/mentor-data-source'
import { buildParticipantList } from '@/lib/mentor-view'
import { DashboardHeader } from '@/components/dashboard-header'
import { pageWrapperStyle } from '@/lib/brand'
import { ParticipantsTable } from './participants-table'

export default async function ParticipantsPage() {
  const supabase = await createSupabaseServerClient()
  const dataSource = createSupabaseMentorDataSource(supabase)
  const [participants, mentors] = await Promise.all([
    buildParticipantList(dataSource, new Date()),
    dataSource.listMentors(),
  ])

  return (
    <>
      <DashboardHeader active="participants" />
      <main style={pageWrapperStyle}>
        <h1>נרשמים</h1>
        <ParticipantsTable initialParticipants={participants} mentors={mentors} />
      </main>
    </>
  )
}
```

- [ ] **Step 2: Build**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run build`
Expected: PASS, `/participants` route still present, no unused-import errors.

- [ ] **Step 3: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/participants/page.tsx
git commit -m "feat(mentor-dashboard): use shared DashboardHeader on participants page"
```

---

### Task 7: `content/page.tsx` uses `DashboardHeader`

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/app/content/page.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/content/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseContentDataSource } from '@/lib/content-data-source'
import { groupMessagesByDay } from '@/lib/content-view'
import { DashboardHeader } from '@/components/dashboard-header'
import { pageWrapperStyle } from '@/lib/brand'
import { ContentGrid } from './content-grid'

export default async function ContentPage() {
  const supabase = await createSupabaseServerClient()
  const dataSource = createSupabaseContentDataSource(supabase)
  const [days, messages] = await Promise.all([dataSource.listAllContentDays(), dataSource.listAllMessages()])
  const initialGroups = groupMessagesByDay(days, messages)

  return (
    <>
      <DashboardHeader active="content" />
      <main style={pageWrapperStyle}>
        <h1>תכנים</h1>
        <ContentGrid initialGroups={initialGroups} />
      </main>
    </>
  )
}
```

- [ ] **Step 2: Build**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run build`
Expected: PASS, `/content` route still present.

- [ ] **Step 3: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/content/page.tsx
git commit -m "feat(mentor-dashboard): use shared DashboardHeader on content page"
```

---

### Task 8: `mentors/new/page.tsx` uses `DashboardHeader` + `authCardStyles`

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/app/mentors/new/page.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/mentors/new/page.tsx
import { createMentor } from '../actions'
import { DashboardHeader } from '@/components/dashboard-header'
import { authCardStyles } from '@/lib/auth-card-styles'

const ERROR_MESSAGES: Record<string, string> = {
  'missing-fields': 'יש למלא שם, אימייל וטלפון',
  'email-exists': 'כבר קיימת מנחה עם האימייל הזה',
  'create-failed': 'יצירת המנחה נכשלה, נסי שוב',
  'server-misconfigured': 'שגיאת הגדרות שרת — פנה למפתח',
}

export default async function NewMentorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams
  return (
    <>
      <DashboardHeader active="mentors" />
      <div style={authCardStyles.body}>
        <div style={authCardStyles.card}>
          <h1 style={authCardStyles.h1}>מנחה חדשה</h1>
          <p style={authCardStyles.helperText}>סיסמת ההתחברות של המנחה תהיה מספר הטלפון שלה, כפי שמוזן כאן.</p>
          <form action={createMentor}>
            <label style={authCardStyles.label}>
              שם מלא
              <input style={authCardStyles.input} name="fullName" type="text" required />
            </label>
            <label style={authCardStyles.label}>
              אימייל
              <input style={authCardStyles.input} name="email" type="email" required />
            </label>
            <label style={authCardStyles.label}>
              טלפון (יהיה גם הסיסמה)
              <input style={authCardStyles.input} name="phone" type="tel" required />
            </label>
            <button style={authCardStyles.button} type="submit">
              הוסף מנחה
            </button>
          </form>
          {error && <p style={authCardStyles.errorText}>{ERROR_MESSAGES[error] ?? 'שגיאה'}</p>}
          {success && <p style={authCardStyles.successText}>המנחה נוצרה בהצלחה!</p>}
        </div>
      </div>
    </>
  )
}
```

Note: the old manual `← חזרה לנרשמים` link is dropped — `DashboardHeader` now provides navigation back to every screen, so a redundant one-way link is no longer needed.

- [ ] **Step 2: Build**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run build`
Expected: PASS, `/mentors/new` route still present.

- [ ] **Step 3: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/mentors/new/page.tsx
git commit -m "feat(mentor-dashboard): brand the new-mentor screen and add DashboardHeader nav"
```

---

### Task 9: Brand `login/page.tsx`

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/app/login/page.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/login/page.tsx
import { signIn } from './actions'
import { LOGO_URL } from '@/lib/brand'
import { authCardStyles } from '@/lib/auth-card-styles'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <div style={authCardStyles.body}>
      <div style={authCardStyles.card}>
        <img style={authCardStyles.logo} src={LOGO_URL} alt="החממה" />
        <h1 style={authCardStyles.h1}>כניסת מנחות</h1>
        <form action={signIn}>
          <label style={authCardStyles.label}>
            אימייל
            <input style={authCardStyles.input} name="email" type="email" required />
          </label>
          <label style={authCardStyles.label}>
            סיסמה
            <input style={authCardStyles.input} name="password" type="password" required />
          </label>
          <button style={authCardStyles.button} type="submit">
            התחברות
          </button>
        </form>
        {error === 'invalid-credentials' && <p style={authCardStyles.errorText}>אימייל או סיסמה שגויים</p>}
        {error === 'missing-fields' && <p style={authCardStyles.errorText}>יש למלא אימייל וסיסמה</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run build`
Expected: PASS, `/login` route still present.

- [ ] **Step 3: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/login/page.tsx
git commit -m "feat(mentor-dashboard): brand the login screen"
```

---

### Task 10: Brand `reset-password/page.tsx`

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/app/reset-password/page.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/reset-password/page.tsx
// לקוח-בלבד בכוונה: קישור איפוס הסיסמה של Supabase יכול להגיע עם טוקנים ב-hash
// fragment (#access_token=...) שאף שרת לא יכול לראות (דפדפנים לא שולחים hash
// לשרת) — רק ה-SDK בדפדפן (createBrowserClient, detectSessionInUrl כברירת מחדל)
// מזהה ומעבד את זה, בין אם זה hash ובין אם code ב-query string.
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LOGO_URL } from '@/lib/brand'
import { authCardStyles } from '@/lib/auth-card-styles'

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // נוצר רק בתוך useEffect (client-only) — קריאה ל-createBrowserClient בגוף
  // הקומפוננטה ישירות רצה גם בעת ה-SSR prerender pass של Next.js, בלי env vars.
  const supabaseRef = useRef<SupabaseClient | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabaseRef.current = supabase

    // Supabase Studio שולחת קישור עם טוקנים ב-hash fragment (#access_token=...),
    // לא PKCE code — detectSessionInUrl של ה-SDK לא תמיד תופס את זה אוטומטית
    // ב-App Router, אז מפרשים את ה-hash ידנית וקוראים ל-setSession במפורש.
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
    const hashParams = new URLSearchParams(hash)
    const access_token = hashParams.get('access_token')
    const refresh_token = hashParams.get('refresh_token')

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error: sessionError }) => {
        if (sessionError) setError(sessionError.message)
        else setReady(true)
      })
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabaseRef.current) return
    setSubmitting(true)
    setError(null)
    const { error: updateError } = await supabaseRef.current.auth.updateUser({ password })
    setSubmitting(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    router.push('/participants')
  }

  if (!ready) {
    return (
      <div style={authCardStyles.body}>
        <div style={authCardStyles.card}>
          <img style={authCardStyles.logo} src={LOGO_URL} alt="החממה" />
          <h1 style={authCardStyles.h1}>קביעת סיסמה חדשה</h1>
          <p style={authCardStyles.helperText}>
            מאתר את קישור האיפוס... אם זה נמשך יותר מכמה שניות, הקישור פג תוקף — יש לבקש קישור חדש.
          </p>
          {error && <p style={authCardStyles.errorText}>{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div style={authCardStyles.body}>
      <div style={authCardStyles.card}>
        <img style={authCardStyles.logo} src={LOGO_URL} alt="החממה" />
        <h1 style={authCardStyles.h1}>קביעת סיסמה חדשה</h1>
        <form onSubmit={handleSubmit}>
          <label style={authCardStyles.label}>
            סיסמה חדשה
            <input
              style={authCardStyles.input}
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button style={authCardStyles.button} type="submit" disabled={submitting}>
            שמור סיסמה
          </button>
        </form>
        {error && <p style={authCardStyles.errorText}>{error}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run build`
Expected: PASS, `/reset-password` route still present.

- [ ] **Step 3: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/reset-password/page.tsx
git commit -m "feat(mentor-dashboard): brand the reset-password screen"
```

---

### Task 11: Brand `participants-table.tsx`

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/app/participants/participants-table.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/participants/participants-table.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { createSupabaseMentorDataSource, type MentorRecord } from '@/lib/mentor-data-source'
import { calculateDay1Date } from '@/lib/program-day'
import { canDeleteParticipant, type ParticipantListItem } from '@/lib/mentor-view'
import { BRAND, buttonPrimaryStyle, buttonSecondaryStyle, buttonDangerStyle } from '@/lib/brand'

const textInputStyle = {
  padding: '6px 10px',
  border: `1px solid ${BRAND.greenMuted}`,
  borderRadius: 8,
  fontSize: 14,
} as const

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
        <p style={{ color: BRAND.copper }}>
          {blockedMessage}{' '}
          <button style={buttonSecondaryStyle} onClick={() => setBlockedMessage(null)}>
            סגור
          </button>
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <input style={textInputStyle} placeholder="שם מלא" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <input style={textInputStyle} placeholder="טלפון" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
        <button style={buttonPrimaryStyle} onClick={handleAdd}>
          + נרשם חדש
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: BRAND.paper }}>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}>שם</th>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}>טלפון</th>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}>יום בתוכנית</th>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}>לחץ היום?</th>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}>סטטוס</th>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}>מנחה מוצמדת</th>
            <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '8px 6px' }}></th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) =>
            editingId === p.id ? (
              <EditRow key={p.id} participant={p} mentors={mentors} onSave={handleFieldSave} onCancel={() => setEditingId(null)} />
            ) : (
              <tr key={p.id} style={{ borderTop: `1px solid ${BRAND.border}` }}>
                <td style={{ padding: '6px' }}>
                  <Link href={`/participants/${p.id}`} style={{ color: BRAND.greenDark }}>
                    {p.fullName}
                  </Link>
                </td>
                <td style={{ padding: '6px' }}>{p.phone}</td>
                <td style={{ padding: '6px' }}>{p.programDay}</td>
                <td style={{ padding: '6px' }}>{p.clickedToday ? '✅' : '❌'}</td>
                <td style={{ padding: '6px' }}>{p.status}</td>
                <td style={{ padding: '6px' }}>{p.assignedMentorName ?? '—'}</td>
                <td style={{ padding: '6px' }}>
                  <button style={buttonSecondaryStyle} onClick={() => setEditingId(p.id)}>
                    ✎
                  </button>
                  <button style={{ ...buttonDangerStyle, marginRight: 4 }} onClick={() => handleDelete(p.id)}>
                    🗑
                  </button>
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
    <tr style={{ borderTop: `1px solid ${BRAND.border}` }}>
      <td style={{ padding: '6px' }}>
        <input style={textInputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </td>
      <td style={{ padding: '6px' }}>
        <input style={textInputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </td>
      <td style={{ padding: '6px' }}>{participant.programDay}</td>
      <td style={{ padding: '6px' }}>{participant.clickedToday ? '✅' : '❌'}</td>
      <td style={{ padding: '6px' }}>
        <select style={textInputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">active</option>
          <option value="paused">paused</option>
          <option value="completed">completed</option>
        </select>
      </td>
      <td style={{ padding: '6px' }}>
        <select style={textInputStyle} value={assignedMentorId} onChange={(e) => setAssignedMentorId(e.target.value)}>
          <option value="">—</option>
          {mentors.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name}
            </option>
          ))}
        </select>
      </td>
      <td style={{ padding: '6px' }}>
        <button
          style={{ ...buttonPrimaryStyle, marginLeft: 4 }}
          onClick={() => onSave(participant.id, { fullName, phone, status, assignedMentorId: assignedMentorId || null })}
        >
          שמור
        </button>
        <button style={buttonSecondaryStyle} onClick={onCancel}>
          בטל
        </button>
      </td>
    </tr>
  )
}
```

- [ ] **Step 2: Build**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/participants/participants-table.tsx
git commit -m "feat(mentor-dashboard): brand the participants table and its buttons"
```

---

### Task 12: Brand `edit-panel.tsx`

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/app/content/edit-panel.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/content/edit-panel.tsx
'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { createSupabaseContentDataSource } from '@/lib/content-data-source'
import { validateMediaFile } from '@/lib/content-view'
import type { MessageRecord } from '@/lib/content-data-source'
import { BRAND, buttonSecondaryStyle } from '@/lib/brand'

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
        background: BRAND.white,
        borderLeft: `1px solid ${BRAND.border}`,
        padding: 16,
        overflowY: 'auto',
      }}
    >
      <button style={buttonSecondaryStyle} onClick={onClose}>
        ✕ סגור
      </button>
      <h3 style={{ color: BRAND.greenDark }}>
        יום {message.content_day_number}, {message.send_offset_time}
      </h3>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => onBodySave(body)}
        rows={8}
        style={{ width: '100%', border: `1px solid ${BRAND.greenMuted}`, borderRadius: 8, padding: 8, boxSizing: 'border-box' }}
      />
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        style={{
          border: `1px dashed ${BRAND.greenMuted}`,
          borderRadius: 8,
          padding: 16,
          marginTop: 12,
          textAlign: 'center',
          color: BRAND.greenDark,
        }}
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
        {error && <p style={{ color: BRAND.copper }}>{error}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/content/edit-panel.tsx
git commit -m "feat(mentor-dashboard): brand the content edit panel"
```

---

### Task 13: Root layout background

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/app/layout.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/layout.tsx
import { BRAND } from '@/lib/brand'

export const metadata = {
  title: 'החממה — דשבורד מנחות',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ margin: 0, background: BRAND.paper }}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Build**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/layout.tsx
git commit -m "feat(mentor-dashboard): set brand paper background on root layout"
```

---

### Task 14: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite + typecheck + build**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm test && npm run typecheck && npm run build`
Expected: all PASS — this is the same gate every prior session in this project has used before merging (see `vault/Meeting Notes/parenting-course-whatsapp-companion.md`).

- [ ] **Step 2: Manual browser walkthrough (dev server)**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run dev`, then in the browser check each route renders with the logo + brand colors and no console errors:
- `/login` — card, logo, green button
- `/mentors/new` — header with nav + logo, branded form card
- `/reset-password` — "מאתר את קישור האיפוס..." branded state (no real recovery token locally, so this is the only reachable state — that's expected)
- `/video-submit` — unchanged visually from before the refactor
- After logging in with a real mentor account: `/participants` — header with nav+logo, branded table
- `/content` — header with nav+logo, day headers now show "יום X — שבוע Y", branded buttons

- [ ] **Step 3: Screenshot the branded `/participants` and `/content` screens for the user**

No commit for this task — it's verification only.

---

## Notes for the implementer

- `LOGO_URL` points at the **existing** public Supabase Storage object created during the `/video-submit` branding work (session `2026-08-04–05` in the vault) — do not re-upload the logo.
- Every page in this plan keeps using inline `style={{...}}` objects, matching the project's existing convention — do not introduce Tailwind, CSS Modules, or a global stylesheet.
- Task ordering matters: Task 2 (shared modules) must land before every task that imports from `@/lib/brand` or `@/lib/auth-card-styles`. Task 5 (`DashboardHeader`) must land before Tasks 6–8.
- `node_modules` already exists in `mentor-dashboard/` — no `npm install` should be needed. If it's missing and `npm install` fails with `ERR_SSL_CIPHER_OPERATION_FAILED`, that's the known local-machine OpenSSL bug documented in the vault topic file — flag it, don't try to silently work around it without the loopback proxy script.
