import { describe, expect, it } from 'vitest'
import type { MentorDataSource } from './mentor-data-source'
import { buildParticipantDetail, buildParticipantList, canDeleteParticipant } from './mentor-view'

function fakeDataSource(overrides: Partial<MentorDataSource> = {}): MentorDataSource {
  return {
    listParticipants: async () => [],
    getTriggersForDate: async () => [],
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
      getTriggersForDate: async () => [{ participant_id: 'p1', clicked_at: '2026-08-16T06:00:00Z' }],
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
        assigned_mentor_id: null,
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
