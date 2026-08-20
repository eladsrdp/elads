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

describe('buildParticipantsExport', () => {
  it('מסמן false/false לנרשם בלי טריגר היום (לא הגיע היום, אין תוכן, וכו׳)', () => {
    const result = buildParticipantsExport([participant()], [])
    expect(result[0].triggerSentToday).toBe(false)
    expect(result[0].clickedToday).toBe(false)
  })

  it('מסמן triggerSentToday=true, clickedToday=false לנרשם שהטריגר נשלח לו אבל לא לחץ', () => {
    const result = buildParticipantsExport([participant()], [trigger({ trigger_sent_at: '2026-08-16T03:45:00.000Z' })])
    expect(result[0].triggerSentToday).toBe(true)
    expect(result[0].clickedToday).toBe(false)
  })

  it('מסמן clickedToday=true לנרשם שלחץ על הכפתור', () => {
    const result = buildParticipantsExport(
      [participant()],
      [trigger({ trigger_sent_at: '2026-08-16T03:45:00.000Z', clicked_at: '2026-08-16T07:02:00.000Z' })],
    )
    expect(result[0].clickedToday).toBe(true)
  })

  it('מתאים טריגרים לנרשמים הנכונים כשיש כמה נרשמים', () => {
    const result = buildParticipantsExport(
      [participant({ id: 'p1' }), participant({ id: 'p2', full_name: 'שרה כהן' })],
      [trigger({ participant_id: 'p2', clicked_at: '2026-08-16T07:02:00.000Z' })],
    )
    const p1 = result.find((r) => r.participantId === 'p1')!
    const p2 = result.find((r) => r.participantId === 'p2')!
    expect(p1.clickedToday).toBe(false)
    expect(p2.clickedToday).toBe(true)
  })
})
