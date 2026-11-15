import { describe, expect, it } from 'vitest'
import { buildParticipantsExport } from './participants-export'
import type { DailyTriggerRow, ParticipantRow } from '../repository/interface'

function participant(overrides: Partial<ParticipantRow> = {}): ParticipantRow {
  return {
    id: 'p1',
    full_name: 'ישראל ישראלי',
    phone: '+972501234567',
    signup_source_ref: null,
    signup_at: '2026-08-02T10:00:00.000Z',
    day1_date: '2026-08-09',
    status: 'active',
    assigned_mentor_id: null,
    timezone: 'Asia/Jerusalem',
    ...overrides,
  }
}

function trigger(overrides: Partial<DailyTriggerRow> = {}): DailyTriggerRow {
  return {
    id: 't1',
    participant_id: 'p1',
    calendar_date: '2026-08-16',
    content_day_number: 29,
    trigger_sent_at: null,
    clicked_at: null,
    ...overrides,
  }
}

// "עכשיו" קבוע — 2026-08-16 12:00 בישראל — כדי שה"היום" של הטריגרים בטסטים יהיה דטרמיניסטי.
const NOW = new Date('2026-08-16T09:00:00Z')
const buildParticipantsExportAt = (p: ParticipantRow[], t: DailyTriggerRow[]) => buildParticipantsExport(p, t, NOW)

describe('buildParticipantsExport', () => {
  it('מסמן false/false לנרשם בלי טריגר היום (לא הגיע היום, אין תוכן, וכו׳)', () => {
    const result = buildParticipantsExportAt([participant()], [])
    expect(result[0].triggerSentToday).toBe(false)
    expect(result[0].clickedToday).toBe(false)
  })

  it('מסמן triggerSentToday=true, clickedToday=false לנרשם שהטריגר נשלח לו אבל לא לחץ', () => {
    const result = buildParticipantsExportAt([participant()], [trigger({ trigger_sent_at: '2026-08-16T03:45:00.000Z' })])
    expect(result[0].triggerSentToday).toBe(true)
    expect(result[0].clickedToday).toBe(false)
  })

  it('מסמן clickedToday=true לנרשם שלחץ על הכפתור', () => {
    const result = buildParticipantsExportAt(
      [participant()],
      [trigger({ trigger_sent_at: '2026-08-16T03:45:00.000Z', clicked_at: '2026-08-16T07:02:00.000Z' })],
    )
    expect(result[0].clickedToday).toBe(true)
  })

  it('מתאים טריגרים לנרשמים הנכונים כשיש כמה נרשמים', () => {
    const result = buildParticipantsExportAt(
      [participant({ id: 'p1' }), participant({ id: 'p2', full_name: 'שרה כהן' })],
      [trigger({ participant_id: 'p2', clicked_at: '2026-08-16T07:02:00.000Z' })],
    )
    const p1 = result.find((r) => r.participantId === 'p1')!
    const p2 = result.find((r) => r.participantId === 'p2')!
    expect(p1.clickedToday).toBe(false)
    expect(p2.clickedToday).toBe(true)
  })
})

describe('buildParticipantsExport — אזורי זמן', () => {
  it('"היום" פר-משתתפת: ב-2026-08-16T23:30Z בישראל כבר 17.8 ובניו יורק עדיין 16.8 — כל אחת מקבלת את הטריגר של התאריך המקומי שלה', () => {
    const now = new Date('2026-08-16T23:30:00Z')
    const result = buildParticipantsExport(
      [participant({ id: 'il' }), participant({ id: 'ny', timezone: 'America/New_York' })],
      [
        trigger({ id: 't-il-16', participant_id: 'il', calendar_date: '2026-08-16', clicked_at: '2026-08-16T05:00:00.000Z' }),
        trigger({ id: 't-ny-16', participant_id: 'ny', calendar_date: '2026-08-16', clicked_at: '2026-08-16T12:00:00.000Z' }),
      ],
      now,
    )
    const il = result.find((r) => r.participantId === 'il')!
    const ny = result.find((r) => r.participantId === 'ny')!
    expect(il.clickedToday).toBe(false) // בישראל כבר 17.8, ואין לה טריגר להיום
    expect(ny.clickedToday).toBe(true)
    expect(ny.timezone).toBe('America/New_York')
  })
})
