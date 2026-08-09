# Mentor Activity Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain participants table on `/participants` with a card grid (per-mentee: today's click, missed-day streak, video count, delivery count), add a "רק שלי" filter by assigned mentor, sort cards attention-first, and move participant editing/deletion from the list onto the (now-editable) participant detail page.

**Architecture:** Extend the existing pure view layer (`mentor-view.ts`) with new computed fields sourced from three new bulk `MentorDataSource` queries (recent triggers, delivery counts, video counts — all grouped client-side in plain JS, matching this project's existing "fetch everything, aggregate in memory" convention at its current scale of dozens–hundreds of participants). A new pure `calculateMissedStreak` helper lives next to the other pure date functions in `program-day.ts`. UI-wise: `ParticipantsTable` is replaced by `ParticipantsCards` (a card grid), and the participant detail page gains an editable header section (`ParticipantDetailContent`) — mirroring the edit-then-delete pattern already used on the old table's `EditRow`.

**Tech Stack:** Next.js 15 (Server Components + Client Components), Supabase, Vitest, Luxon. No new dependencies. Continues the existing inline-style-object convention (`src/lib/brand.ts`).

**Decisions locked in during brainstorming (2026-08-09, chat + Visual Companion):**
- Mentors keep seeing *everyone* (no access restriction) — "רק שלי" is a client-side filter, not a permission change.
- Card layout (Visual Companion option B), not an enhanced table or a triage-banner-on-top-of-the-table.
- Card click navigates to `/participants/[id]` for everything (view + edit + delete) — nothing is edited inline on the card.
- Sort order: attention-first — highest missed-streak first, paused/completed (streak N/A) sink to the bottom, ties broken alphabetically.
- "Today" only counts as a missed day once its `daily_trigger` row actually exists (avoids flagging someone as "missed" before the morning cron has even run).

---

### Task 1: `calculateMissedStreak` pure helper

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/lib/program-day.ts`
- Test: `hachamama-parenting-program/mentor-dashboard/src/lib/program-day.test.ts`

- [ ] **Step 1: Write the failing tests**

In `program-day.test.ts`, replace the existing import line (the file currently imports `calculateDay1Date, calculateProgramDayNumber, calculateWeekNumber, getIsraelDateString`) with:

```ts
import { calculateDay1Date, calculateMissedStreak, calculateProgramDayNumber, calculateWeekNumber, getIsraelDateString } from './program-day'
```

Then add this new `describe` block at the end of the file:

```ts
describe('calculateMissedStreak', () => {
  it('מחזיר null לנרשם לא-פעיל, בלי קשר להיסטוריה', () => {
    expect(calculateMissedStreak([{ calendarDate: '2026-08-16', clickedAt: null }], '2026-08-16', 'paused')).toBeNull()
    expect(calculateMissedStreak([], '2026-08-16', 'completed')).toBeNull()
  })

  it('לחץ היום → רצף 0', () => {
    const history = [{ calendarDate: '2026-08-16', clickedAt: '2026-08-16T06:10:00Z' }]
    expect(calculateMissedStreak(history, '2026-08-16', 'active')).toBe(0)
  })

  it('לא לחץ היום (יש לו trigger) ולחץ אתמול → רצף 1', () => {
    const history = [
      { calendarDate: '2026-08-16', clickedAt: null },
      { calendarDate: '2026-08-15', clickedAt: '2026-08-15T06:10:00Z' },
    ]
    expect(calculateMissedStreak(history, '2026-08-16', 'active')).toBe(1)
  })

  it('3 ימים ברצף בלי לחיצה, יום רביעי אחורה לחץ → רצף 3', () => {
    const history = [
      { calendarDate: '2026-08-16', clickedAt: null },
      { calendarDate: '2026-08-15', clickedAt: null },
      { calendarDate: '2026-08-14', clickedAt: null },
      { calendarDate: '2026-08-13', clickedAt: '2026-08-13T06:10:00Z' },
    ]
    expect(calculateMissedStreak(history, '2026-08-16', 'active')).toBe(3)
  })

  it('אין עדיין trigger להיום (ה-cron היומי לא רץ) — לא נספר כ"פספס"', () => {
    const history = [{ calendarDate: '2026-08-15', clickedAt: '2026-08-15T06:10:00Z' }]
    expect(calculateMissedStreak(history, '2026-08-16', 'active')).toBe(0)
  })

  it('יום 1 בתוכנית, עדיין לא לחץ, אין היסטוריה קודמת → רצף 1, לא ממשיך לפני day1', () => {
    const history = [{ calendarDate: '2026-08-16', clickedAt: null }]
    expect(calculateMissedStreak(history, '2026-08-16', 'active')).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm test -- program-day`
Expected: FAIL — `calculateMissedStreak is not a function` / import error.

- [ ] **Step 3: Implement**

Add to `program-day.ts` (end of file):

```ts
export interface DailyTriggerHistoryEntry {
  calendarDate: string
  clickedAt: string | null
}

/**
 * כמה ימים ברצף (מהיום אחורה) שהנרשם לא לחץ על כפתור הבוקר. `null` אם הנרשם לא
 * פעיל (paused/completed) — הרצף לא רלוונטי עבורו. "היום" נספר כ"לא לחץ" רק אם
 * כבר קיים לו daily_trigger להיום (אחרת ה-cron היומי עוד לא רץ, ומוקדם לתייג
 * "פספס"). העצירה קורית גם בפער (אין trigger לאותו תאריך) — סימן שהתוכנית עדיין
 * לא התחילה עבורו באותו תאריך, אין למה להמשיך אחורה.
 */
export function calculateMissedStreak(
  history: DailyTriggerHistoryEntry[],
  todayDate: string,
  participantStatus: string,
): number | null {
  if (participantStatus !== 'active') return null

  const clickedAtByDate = new Map(history.map((h) => [h.calendarDate, h.clickedAt]))
  let cursor = DateTime.fromISO(todayDate, { zone: 'utc' })
  if (!clickedAtByDate.has(cursor.toISODate() as string)) {
    cursor = cursor.minus({ days: 1 })
  }

  let streak = 0
  while (clickedAtByDate.has(cursor.toISODate() as string)) {
    if (clickedAtByDate.get(cursor.toISODate() as string) !== null) break
    streak++
    cursor = cursor.minus({ days: 1 })
  }
  return streak
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm test -- program-day`
Expected: PASS, all `program-day.test.ts` cases green (14 tests total: 8 existing + 6 new).

- [ ] **Step 5: Commit**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/lib/program-day.ts hachamama-parenting-program/mentor-dashboard/src/lib/program-day.test.ts
git commit -m "feat(mentor-dashboard): add calculateMissedStreak helper"
```

---

### Task 2: Bulk queries on `MentorDataSource`

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/lib/mentor-data-source.ts`

No dedicated test file — this adapter is intentionally untested directly (see the file's own header comment: "thin adapter, לא נבדק ישירות... הלוגיקה שכן שווה בדיקה נמצאת ב-mentor-view.ts"). Verified via typecheck only; Task 3's fakes exercise the interface shape.

- [ ] **Step 1: Replace `getTriggersForDate`/`DailyTriggerRecord` and add two new bulk methods**

In the interfaces section, replace:

```ts
export interface DailyTriggerRecord {
  participant_id: string
  clicked_at: string | null
}
```

with:

```ts
export interface TriggerHistoryRecord {
  participant_id: string
  calendar_date: string
  clicked_at: string | null
}

export interface DeliveryCountRecord {
  participant_id: string
  status: string
}

export interface VideoCountRecord {
  participant_id: string
}
```

In the `MentorDataSource` interface, replace:

```ts
  getTriggersForDate(calendarDate: string): Promise<DailyTriggerRecord[]>
```

with:

```ts
  getTriggersSince(fromDate: string): Promise<TriggerHistoryRecord[]>
  getDeliveryCountsByParticipant(): Promise<DeliveryCountRecord[]>
  getVideoSubmissionCountsByParticipant(): Promise<VideoCountRecord[]>
```

In `createSupabaseMentorDataSource`, replace the `getTriggersForDate` implementation:

```ts
    async getTriggersForDate(calendarDate) {
      const { data, error } = await supabase
        .from('daily_triggers')
        .select('participant_id, clicked_at')
        .eq('calendar_date', calendarDate)
      if (error) throw error
      return data as DailyTriggerRecord[]
    },
```

with:

```ts
    async getTriggersSince(fromDate) {
      const { data, error } = await supabase
        .from('daily_triggers')
        .select('participant_id, calendar_date, clicked_at')
        .gte('calendar_date', fromDate)
      if (error) throw error
      return data as TriggerHistoryRecord[]
    },

    async getDeliveryCountsByParticipant() {
      const { data, error } = await supabase.from('message_deliveries').select('participant_id, status')
      if (error) throw error
      return data as DeliveryCountRecord[]
    },

    async getVideoSubmissionCountsByParticipant() {
      const { data, error } = await supabase.from('video_submissions').select('participant_id')
      if (error) throw error
      return data as VideoCountRecord[]
    },
```

- [ ] **Step 2: Typecheck**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run typecheck`
Expected: FAILS at this point — `mentor-view.ts` and `mentor-view.test.ts` still reference the old `getTriggersForDate`/`DailyTriggerRecord`. That's expected; Task 3 fixes it. Do not commit yet — Task 2 and Task 3 land in one commit since they're two halves of the same interface change.

---

### Task 3: Extend `buildParticipantList` + `buildParticipantDetail`

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.ts`
- Modify: `hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.test.ts`

- [ ] **Step 1: Rewrite the test file's fakes and expectations**

Replace the entire contents of `mentor-view.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { MentorDataSource } from './mentor-data-source'
import { buildParticipantDetail, buildParticipantList, canDeleteParticipant, sortParticipantsByAttention } from './mentor-view'

function fakeDataSource(overrides: Partial<MentorDataSource> = {}): MentorDataSource {
  return {
    listParticipants: async () => [],
    getTriggersSince: async () => [],
    getDeliveryCountsByParticipant: async () => [],
    getVideoSubmissionCountsByParticipant: async () => [],
    getParticipant: async () => null,
    getDeliveriesForParticipant: async () => [],
    getVideoSubmissionsForParticipant: async () => [],
    listMentors: async () => [],
    createParticipant: async () => {
      throw new Error('not implemented in this fake')
    },
    updateParticipant: async () => {},
    deleteParticipant: async () => {},
    getParticipantHistoryCounts: async () => ({ triggers: 0, deliveries: 0, videoSubmissions: 0 }),
    ...overrides,
  }
}

describe('buildParticipantList', () => {
  it('מחשב יום-תוכנית נכון ומסמן מי לחץ היום לפי daily_triggers', async () => {
    const dataSource = fakeDataSource({
      listParticipants: async () => [
        {
          id: 'p1',
          full_name: 'דנה כהן',
          phone: '+972500000001',
          status: 'active',
          day1_date: '2026-08-02',
          assigned_mentor_id: null,
        },
        {
          id: 'p2',
          full_name: 'אבי לוי',
          phone: '+972500000002',
          status: 'active',
          day1_date: '2026-08-02',
          assigned_mentor_id: null,
        },
      ],
      getTriggersSince: async () => [{ participant_id: 'p1', calendar_date: '2026-08-16', clicked_at: '2026-08-16T06:00:00Z' }],
    })

    const result = await buildParticipantList(dataSource, new Date('2026-08-16T10:00:00Z'))

    expect(result).toEqual([
      {
        id: 'p1',
        fullName: 'דנה כהן',
        phone: '+972500000001',
        status: 'active',
        programDay: 15,
        clickedToday: true,
        missedStreak: 0,
        videoCount: 0,
        deliveriesSent: 0,
        deliveriesTotal: 0,
        assignedMentorId: null,
        assignedMentorName: null,
      },
      {
        id: 'p2',
        fullName: 'אבי לוי',
        phone: '+972500000002',
        status: 'active',
        programDay: 15,
        clickedToday: false,
        missedStreak: 0,
        videoCount: 0,
        deliveriesSent: 0,
        deliveriesTotal: 0,
        assignedMentorId: null,
        assignedMentorName: null,
      },
    ])
  })

  it('מנוי בלי daily_trigger היום מסומן כלא-לחץ, לא זורק שגיאה', async () => {
    const dataSource = fakeDataSource({
      listParticipants: async () => [
        {
          id: 'p1',
          full_name: 'דנה כהן',
          phone: '+972500000001',
          status: 'active',
          day1_date: '2026-08-02',
          assigned_mentor_id: null,
        },
      ],
      getTriggersSince: async () => [],
    })

    const result = await buildParticipantList(dataSource, new Date('2026-08-16T10:00:00Z'))

    expect(result[0].clickedToday).toBe(false)
  })

  it('סופר סרטונים ומשלוחים לכל נרשם בנפרד', async () => {
    const dataSource = fakeDataSource({
      listParticipants: async () => [
        {
          id: 'p1',
          full_name: 'דנה כהן',
          phone: '+972500000001',
          status: 'active',
          day1_date: '2026-08-02',
          assigned_mentor_id: null,
        },
      ],
      getVideoSubmissionCountsByParticipant: async () => [{ participant_id: 'p1' }, { participant_id: 'p1' }],
      getDeliveryCountsByParticipant: async () => [
        { participant_id: 'p1', status: 'sent' },
        { participant_id: 'p1', status: 'sent' },
        { participant_id: 'p1', status: 'pending' },
      ],
    })

    const result = await buildParticipantList(dataSource, new Date('2026-08-16T10:00:00Z'))

    expect(result[0].videoCount).toBe(2)
    expect(result[0].deliveriesSent).toBe(2)
    expect(result[0].deliveriesTotal).toBe(3)
  })

  it('משתמש במנחה מוצמדת מ-listMentors לשם התצוגה', async () => {
    const dataSource = fakeDataSource({
      listParticipants: async () => [
        {
          id: 'p1',
          full_name: 'דנה כהן',
          phone: '+972500000001',
          status: 'active',
          day1_date: '2026-08-02',
          assigned_mentor_id: 'm1',
        },
      ],
      listMentors: async () => [{ user_id: 'm1', full_name: 'רוני מנחה' }],
    })

    const result = await buildParticipantList(dataSource, new Date('2026-08-16T10:00:00Z'))

    expect(result[0].assignedMentorName).toBe('רוני מנחה')
  })
})

describe('sortParticipantsByAttention', () => {
  const base = {
    phone: '',
    programDay: 1,
    clickedToday: false,
    videoCount: 0,
    deliveriesSent: 0,
    deliveriesTotal: 0,
    assignedMentorId: null,
    assignedMentorName: null,
  }

  it('רצף גבוה יותר קודם', () => {
    const items = [
      { ...base, id: 'a', fullName: 'א', status: 'active', missedStreak: 1 },
      { ...base, id: 'b', fullName: 'ב', status: 'active', missedStreak: 3 },
    ]
    expect(sortParticipantsByAttention(items).map((p) => p.id)).toEqual(['b', 'a'])
  })

  it('מי שהרצף לא רלוונטי לו (null) שוקע לתחתית', () => {
    const items = [
      { ...base, id: 'a', fullName: 'א', status: 'paused', missedStreak: null },
      { ...base, id: 'b', fullName: 'ב', status: 'active', missedStreak: 0 },
    ]
    expect(sortParticipantsByAttention(items).map((p) => p.id)).toEqual(['b', 'a'])
  })

  it('רצף שווה — מיון אלפביתי לפי שם', () => {
    const items = [
      { ...base, id: 'a', fullName: 'תמר', status: 'active', missedStreak: 0 },
      { ...base, id: 'b', fullName: 'אבי', status: 'active', missedStreak: 0 },
    ]
    expect(sortParticipantsByAttention(items).map((p) => p.id)).toEqual(['b', 'a'])
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
        assigned_mentor_id: 'm1',
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
      getVideoSubmissionsForParticipant: async () => [
        { id: 'v1', video_url: 'https://example.com/v1.mp4', submitted_at: '2026-08-16T09:00:00Z' },
      ],
    })

    const result = await buildParticipantDetail(dataSource, 'p1')

    expect(result?.fullName).toBe('דנה כהן')
    expect(result?.assignedMentorId).toBe('m1')
    expect(result?.deliveries.map((d) => d.messageId)).toEqual(['m1', 'm2'])
    expect(result?.deliveries[0].bodyPreview).toBe(`${longBody.slice(0, 60)}…`)
    expect(result?.deliveries[1].bodyPreview).toBe('קצר')
    expect(result?.videoSubmissions).toEqual([
      { id: 'v1', videoUrl: 'https://example.com/v1.mp4', submittedAt: '2026-08-16T09:00:00Z' },
    ])
  })
})

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

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm test -- mentor-view`
Expected: FAIL — `sortParticipantsByAttention` doesn't exist yet, and `buildParticipantList`/`buildParticipantDetail` don't return the new fields.

- [ ] **Step 3: Rewrite `mentor-view.ts`**

Replace the entire contents of `mentor-view.ts`:

```ts
// לוגיקה טהורה שמעצבת נתונים לתצוגה — מקבלת MentorDataSource, לא יודעת שום דבר על Supabase.
// זה מה שהופך אותה לניתנת-לבדיקה בקלות מול fake (ראו mentor-view.test.ts).
import { DateTime } from 'luxon'
import { calculateMissedStreak, calculateProgramDayNumber, getIsraelDateString } from './program-day'
import type { MentorDataSource } from './mentor-data-source'

const STREAK_LOOKBACK_DAYS = 30

export interface ParticipantListItem {
  id: string
  fullName: string
  phone: string
  status: string
  programDay: number
  clickedToday: boolean
  missedStreak: number | null
  videoCount: number
  deliveriesSent: number
  deliveriesTotal: number
  assignedMentorId: string | null
  assignedMentorName: string | null
}

export async function buildParticipantList(
  dataSource: MentorDataSource,
  now: Date,
): Promise<ParticipantListItem[]> {
  const todayDate = getIsraelDateString(now)
  const lookbackDate = DateTime.fromISO(todayDate, { zone: 'utc' }).minus({ days: STREAK_LOOKBACK_DAYS }).toISODate() as string

  const [participants, recentTriggers, mentors, deliveryRows, videoRows] = await Promise.all([
    dataSource.listParticipants(),
    dataSource.getTriggersSince(lookbackDate),
    dataSource.listMentors(),
    dataSource.getDeliveryCountsByParticipant(),
    dataSource.getVideoSubmissionCountsByParticipant(),
  ])

  const triggersByParticipant = new Map<string, { calendarDate: string; clickedAt: string | null }[]>()
  for (const t of recentTriggers) {
    const list = triggersByParticipant.get(t.participant_id) ?? []
    list.push({ calendarDate: t.calendar_date, clickedAt: t.clicked_at })
    triggersByParticipant.set(t.participant_id, list)
  }

  const deliveryCountsByParticipant = new Map<string, { sent: number; total: number }>()
  for (const d of deliveryRows) {
    const counts = deliveryCountsByParticipant.get(d.participant_id) ?? { sent: 0, total: 0 }
    counts.total++
    if (d.status === 'sent') counts.sent++
    deliveryCountsByParticipant.set(d.participant_id, counts)
  }

  const videoCountByParticipant = new Map<string, number>()
  for (const v of videoRows) {
    videoCountByParticipant.set(v.participant_id, (videoCountByParticipant.get(v.participant_id) ?? 0) + 1)
  }

  const mentorNameById = new Map(mentors.map((m) => [m.user_id, m.full_name]))

  return participants.map((p) => {
    const triggerHistory = triggersByParticipant.get(p.id) ?? []
    const clickedToday = triggerHistory.some((t) => t.calendarDate === todayDate && t.clickedAt !== null)
    const deliveryCounts = deliveryCountsByParticipant.get(p.id) ?? { sent: 0, total: 0 }

    return {
      id: p.id,
      fullName: p.full_name,
      phone: p.phone,
      status: p.status,
      programDay: calculateProgramDayNumber(p.day1_date, todayDate),
      clickedToday,
      missedStreak: calculateMissedStreak(triggerHistory, todayDate, p.status),
      videoCount: videoCountByParticipant.get(p.id) ?? 0,
      deliveriesSent: deliveryCounts.sent,
      deliveriesTotal: deliveryCounts.total,
      assignedMentorId: p.assigned_mentor_id,
      assignedMentorName: p.assigned_mentor_id ? (mentorNameById.get(p.assigned_mentor_id) ?? null) : null,
    }
  })
}

/** ממיין לתשומת-לב: רצף גבוה יותר קודם, מי שהרצף לא רלוונטי לו (null) שוקע לתחתית, שוברי שוויון לפי שם. */
export function sortParticipantsByAttention(items: ParticipantListItem[]): ParticipantListItem[] {
  return [...items].sort((a, b) => {
    const aStreak = a.missedStreak ?? -1
    const bStreak = b.missedStreak ?? -1
    if (aStreak !== bStreak) return bStreak - aStreak
    return a.fullName.localeCompare(b.fullName)
  })
}

export interface DeliveryHistoryItem {
  messageId: string
  contentDayNumber: number
  sendOffsetTime: string
  bodyPreview: string
  status: string
  sentAt: string | null
}

export interface VideoSubmissionItem {
  id: string
  videoUrl: string
  submittedAt: string
}

export interface ParticipantDetailView {
  id: string
  fullName: string
  phone: string
  status: string
  day1Date: string
  assignedMentorId: string | null
  deliveries: DeliveryHistoryItem[]
  videoSubmissions: VideoSubmissionItem[]
}

const BODY_PREVIEW_LENGTH = 60

export async function buildParticipantDetail(
  dataSource: MentorDataSource,
  participantId: string,
): Promise<ParticipantDetailView | null> {
  const participant = await dataSource.getParticipant(participantId)
  if (!participant) return null

  const [deliveries, videoSubmissions] = await Promise.all([
    dataSource.getDeliveriesForParticipant(participantId),
    dataSource.getVideoSubmissionsForParticipant(participantId),
  ])

  return {
    id: participant.id,
    fullName: participant.full_name,
    phone: participant.phone,
    status: participant.status,
    day1Date: participant.day1_date,
    assignedMentorId: participant.assigned_mentor_id,
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
    videoSubmissions: videoSubmissions.map((v) => ({
      id: v.id,
      videoUrl: v.video_url,
      submittedAt: v.submitted_at,
    })),
  }
}

export function canDeleteParticipant(counts: { triggers: number; deliveries: number; videoSubmissions: number }): boolean {
  return counts.triggers === 0 && counts.deliveries === 0 && counts.videoSubmissions === 0
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm test -- mentor-view`
Expected: PASS, all cases green.

- [ ] **Step 5: Typecheck the whole project**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run typecheck`
Expected: PASS — this also closes out Task 2's interface change, since nothing references the old `getTriggersForDate`/`DailyTriggerRecord` anymore.

- [ ] **Step 6: Commit (Task 2 + Task 3 together)**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/lib/mentor-data-source.ts hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.ts hachamama-parenting-program/mentor-dashboard/src/lib/mentor-view.test.ts
git commit -m "feat(mentor-dashboard): compute missed-streak, video count, and delivery count per participant"
```

---

### Task 4: `ParticipantsCards` component

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/participants/participants-cards.tsx`
- Delete: `hachamama-parenting-program/mentor-dashboard/src/app/participants/participants-table.tsx`

- [ ] **Step 1: Create `participants-cards.tsx`**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/participants/participants-cards.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { createSupabaseMentorDataSource } from '@/lib/mentor-data-source'
import { calculateDay1Date } from '@/lib/program-day'
import { sortParticipantsByAttention, type ParticipantListItem } from '@/lib/mentor-view'
import { BRAND, buttonPrimaryStyle } from '@/lib/brand'

const textInputStyle = {
  padding: '6px 10px',
  border: `1px solid ${BRAND.greenMuted}`,
  borderRadius: 8,
  fontSize: 14,
} as const

export function ParticipantsCards({
  initialParticipants,
  currentMentorUserId,
}: {
  initialParticipants: ParticipantListItem[]
  currentMentorUserId: string | null
}) {
  const [participants, setParticipants] = useState(initialParticipants)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)
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
        missedStreak: 0,
        videoCount: 0,
        deliveriesSent: 0,
        deliveriesTotal: 0,
        assignedMentorId: null,
        assignedMentorName: null,
      },
    ])
    setNewName('')
    setNewPhone('')
  }

  const visible = participants.filter((p) => !onlyMine || p.assignedMentorId === currentMentorUserId)
  const sorted = sortParticipantsByAttention(visible)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, margin: '16px 0', alignItems: 'center', flexWrap: 'wrap' }}>
        <input style={textInputStyle} placeholder="שם מלא" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <input style={textInputStyle} placeholder="טלפון" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
        <button style={buttonPrimaryStyle} onClick={handleAdd}>
          + נרשם חדש
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 'auto', color: BRAND.greenDark, fontSize: 14 }}>
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
          רק שלי
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {sorted.map((p) => {
          const needsAttention = (p.missedStreak ?? 0) >= 2
          return (
            <Link
              key={p.id}
              href={`/participants/${p.id}`}
              style={{
                display: 'block',
                background: BRAND.white,
                border: `1px solid ${needsAttention ? BRAND.copper : BRAND.border}`,
                borderRadius: 10,
                padding: 12,
                textDecoration: 'none',
                color: BRAND.greenDark,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{p.fullName}</div>
              <div style={{ fontSize: 13, marginBottom: 2 }}>{p.clickedToday ? '✅ לחצה היום' : '❌ עדיין לא היום'}</div>
              <div
                style={{
                  fontSize: 13,
                  marginBottom: 2,
                  color: needsAttention ? BRAND.copper : BRAND.greenMuted,
                  fontWeight: needsAttention ? 700 : 400,
                }}
              >
                {p.missedStreak === null ? `סטטוס: ${p.status}` : `רצף אי-לחיצה: ${p.missedStreak} ימים`}
              </div>
              <div style={{ fontSize: 13, marginBottom: 2 }}>🎥 {p.videoCount} סרטונים</div>
              <div style={{ fontSize: 13 }}>
                נשלח {p.deliveriesSent}/{p.deliveriesTotal}
              </div>
              {p.assignedMentorName && (
                <div style={{ fontSize: 12, color: BRAND.greenMuted, marginTop: 6 }}>מנחה: {p.assignedMentorName}</div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Delete the old table component**

```bash
rm hachamama-parenting-program/mentor-dashboard/src/app/participants/participants-table.tsx
```

- [ ] **Step 3: Typecheck**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run typecheck`
Expected: FAILS — `participants/page.tsx` still imports the now-deleted `ParticipantsTable`. Expected; Task 5 fixes it. Don't commit yet.

---

### Task 5: Wire `ParticipantsCards` into `/participants`

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
import { ParticipantsCards } from './participants-cards'

export default async function ParticipantsPage() {
  const supabase = await createSupabaseServerClient()
  const dataSource = createSupabaseMentorDataSource(supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const participants = await buildParticipantList(dataSource, new Date())

  return (
    <>
      <DashboardHeader active="participants" />
      <main style={pageWrapperStyle}>
        <h1>נרשמים</h1>
        <ParticipantsCards initialParticipants={participants} currentMentorUserId={user?.id ?? null} />
      </main>
    </>
  )
}
```

- [ ] **Step 2: Typecheck + full test suite**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 3: Commit (Task 4 + Task 5 together — the delete and its replacement must land in one commit so `main` never has a broken intermediate state)**

```bash
git add hachamama-parenting-program/mentor-dashboard/src/app/participants/participants-cards.tsx hachamama-parenting-program/mentor-dashboard/src/app/participants/page.tsx
git add -u hachamama-parenting-program/mentor-dashboard/src/app/participants/participants-table.tsx
git commit -m "feat(mentor-dashboard): replace participants table with a card grid"
```

---

### Task 6: `ParticipantDetailContent` — editable detail page

**Files:**
- Create: `hachamama-parenting-program/mentor-dashboard/src/app/participants/[id]/participant-detail-content.tsx`

- [ ] **Step 1: Create the file**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/participants/[id]/participant-detail-content.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { createSupabaseMentorDataSource, type MentorRecord } from '@/lib/mentor-data-source'
import { canDeleteParticipant, type ParticipantDetailView } from '@/lib/mentor-view'
import { BRAND, buttonPrimaryStyle, buttonSecondaryStyle, buttonDangerStyle } from '@/lib/brand'

const fieldStyle = {
  display: 'block',
  width: '100%',
  padding: '8px 10px',
  border: `1px solid ${BRAND.greenMuted}`,
  borderRadius: 8,
  fontSize: 14,
  marginTop: 4,
  boxSizing: 'border-box' as const,
}

export function ParticipantDetailContent({
  detail,
  mentors,
}: {
  detail: ParticipantDetailView
  mentors: MentorRecord[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(detail.fullName)
  const [phone, setPhone] = useState(detail.phone)
  const [status, setStatus] = useState(detail.status)
  const [assignedMentorId, setAssignedMentorId] = useState(detail.assignedMentorId ?? '')
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const dataSource = createSupabaseMentorDataSource(createSupabaseBrowserClient())

  async function handleSave() {
    setSaving(true)
    await dataSource.updateParticipant(detail.id, { fullName, phone, status, assignedMentorId: assignedMentorId || null })
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  async function handleDelete() {
    const counts = await dataSource.getParticipantHistoryCounts(detail.id)
    if (!canDeleteParticipant(counts)) {
      setBlockedMessage('לא ניתן למחוק — יש לנרשם היסטוריית הודעות. אפשר לשנות סטטוס ל"מושהה" במקום.')
      return
    }
    if (!window.confirm('למחוק את הנרשם?')) return
    await dataSource.deleteParticipant(detail.id)
    router.push('/participants')
  }

  return (
    <div>
      {blockedMessage && <p style={{ color: BRAND.copper }}>{blockedMessage}</p>}

      {editing ? (
        <div style={{ marginBottom: 16, maxWidth: 360 }}>
          <label style={{ fontSize: 13, color: BRAND.greenDark }}>
            שם מלא
            <input style={fieldStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <label style={{ fontSize: 13, color: BRAND.greenDark, display: 'block', marginTop: 10 }}>
            טלפון
            <input style={fieldStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label style={{ fontSize: 13, color: BRAND.greenDark, display: 'block', marginTop: 10 }}>
            סטטוס
            <select style={fieldStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="completed">completed</option>
            </select>
          </label>
          <label style={{ fontSize: 13, color: BRAND.greenDark, display: 'block', marginTop: 10 }}>
            מנחה מוצמדת
            <select style={fieldStyle} value={assignedMentorId} onChange={(e) => setAssignedMentorId(e.target.value)}>
              <option value="">—</option>
              {mentors.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </label>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button style={buttonPrimaryStyle} onClick={handleSave} disabled={saving}>
              {saving ? 'שומר...' : 'שמור'}
            </button>
            <button style={buttonSecondaryStyle} onClick={() => setEditing(false)}>
              בטל
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={buttonSecondaryStyle} onClick={() => setEditing(true)}>
            ✎ עריכה
          </button>
          <button style={buttonDangerStyle} onClick={handleDelete}>
            🗑 מחיקה
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run typecheck`
Expected: PASS (nothing imports it yet, but it must compile standalone).

- [ ] **Step 3: Commit**

```bash
git add "hachamama-parenting-program/mentor-dashboard/src/app/participants/[id]/participant-detail-content.tsx"
git commit -m "feat(mentor-dashboard): add editable participant detail content component"
```

---

### Task 7: Wire editing into `/participants/[id]` + brand the page

**Files:**
- Modify: `hachamama-parenting-program/mentor-dashboard/src/app/participants/[id]/page.tsx`

This page currently has **no branding at all** (it was missed in the 2026-08-09 branding pass because it wasn't in the original 6-page list) — this task fixes that as part of wiring in editing.

- [ ] **Step 1: Replace the file contents**

```tsx
// hachamama-parenting-program/mentor-dashboard/src/app/participants/[id]/page.tsx
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseMentorDataSource } from '@/lib/mentor-data-source'
import { buildParticipantDetail } from '@/lib/mentor-view'
import { DashboardHeader } from '@/components/dashboard-header'
import { pageWrapperStyle, BRAND } from '@/lib/brand'
import { ParticipantDetailContent } from './participant-detail-content'

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const dataSource = createSupabaseMentorDataSource(supabase)
  const [detail, mentors] = await Promise.all([buildParticipantDetail(dataSource, id), dataSource.listMentors()])
  if (!detail) notFound()

  return (
    <>
      <DashboardHeader active="participants" />
      <main style={pageWrapperStyle}>
        <h1>{detail.fullName}</h1>
        <p style={{ color: BRAND.greenMuted }}>
          טלפון: {detail.phone} | סטטוס: {detail.status} | יום 1: {detail.day1Date}
        </p>
        <ParticipantDetailContent detail={detail} mentors={mentors} />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: BRAND.paper }}>
              <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '6px' }}>יום</th>
              <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '6px' }}>שעה</th>
              <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '6px' }}>תוכן</th>
              <th style={{ textAlign: 'right', color: BRAND.greenDark, padding: '6px' }}>סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {detail.deliveries.map((d) => (
              <tr key={d.messageId} style={{ borderTop: `1px solid ${BRAND.border}` }}>
                <td style={{ padding: '6px' }}>{d.contentDayNumber}</td>
                <td style={{ padding: '6px' }}>{d.sendOffsetTime}</td>
                <td style={{ padding: '6px' }}>{d.bodyPreview}</td>
                <td style={{ padding: '6px' }}>{d.status === 'sent' ? '✅ נשלח' : '⏳ ממתין'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {detail.videoSubmissions.length > 0 && (
          <>
            <h2 style={{ marginTop: 24 }}>סרטונים שהועלו</h2>
            <ul>
              {detail.videoSubmissions.map((v) => (
                <li key={v.id}>
                  <a href={v.videoUrl} target="_blank" rel="noreferrer" style={{ color: BRAND.greenDark }}>
                    צפייה בסרטון
                  </a>
                  {' — '}
                  {v.submittedAt}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  )
}
```

- [ ] **Step 2: Typecheck + build**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm run typecheck && npm run build`
Expected: PASS, `/participants/[id]` still listed as a dynamic route.

- [ ] **Step 3: Commit**

```bash
git add "hachamama-parenting-program/mentor-dashboard/src/app/participants/[id]/page.tsx"
git commit -m "feat(mentor-dashboard): make participant detail page editable and branded"
```

---

### Task 8: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite + typecheck + build**

Run: `cd hachamama-parenting-program/mentor-dashboard && npm test && npm run typecheck && npm run build`
Expected: all PASS.

- [ ] **Step 2: Manual browser check (as far as the local sandbox allows)**

Same known limitation as the 2026-08-09 branding session: `/participants` and `/participants/[id]` are behind Supabase auth middleware, and the real `NEXT_PUBLIC_SUPABASE_ANON_KEY` is redacted (`[SENSITIVE]`) in this local environment, so a real login can't be exercised locally. Use the same workaround as before if a visual check is needed: run `next dev` with dummy `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` shell env vars on a spare port — this proves middleware doesn't crash and unauthenticated pages render, but authenticated pages will still redirect to `/login` (no real session). Full visual confirmation of the card grid and the editable detail page requires the user to check the real deployed site after a Vercel deploy.

No commit for this task — it's verification only.

---

## Notes for the implementer

- Task ordering matters: Task 2 and Task 3 are two halves of one interface change — Task 2 alone leaves the project in a non-typechecking state on purpose (documented in its step), and both land in a single commit at the end of Task 3.
- Same for Task 4 and Task 5 (delete `ParticipantsTable` + introduce `ParticipantsCards`, wired in together) — one commit, no broken intermediate `main` state.
- This plan does **not** touch `hachamama-parenting-program/server/` (the old, no-longer-deployed Hono app) — only `mentor-dashboard/`.
- This plan does not deploy anything to Vercel. A deploy is a separate, explicit step after this plan's work is merged (see the project's existing GitHub Actions workflow / `vercel deploy --prod` — both documented in the vault topic file).
