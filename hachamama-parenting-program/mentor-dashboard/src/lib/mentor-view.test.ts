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
