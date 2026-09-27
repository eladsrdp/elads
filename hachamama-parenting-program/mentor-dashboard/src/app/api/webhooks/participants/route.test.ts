// hachamama-parenting-program/mentor-dashboard/src/app/api/webhooks/participants/route.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/engine/app-context', () => ({
  getDb: vi.fn(),
}))
vi.mock('@/engine/env', () => ({
  engineEnv: { MAKE_WEBHOOK_SECRET: 'test-secret' },
}))

import { getDb } from '@/engine/app-context'
import { GET } from './route'

function makeRequest(authHeader?: string): Request {
  return new Request('http://localhost/api/webhooks/participants', {
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

describe('GET /api/webhooks/participants', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockReset()
  })

  it('דוחה בקשה בלי Authorization תקין', async () => {
    const res = await GET(makeRequest('Bearer wrong'))
    expect(res.status).toBe(401)
  })

  it('מחזיר את כל הנרשמים, כולל סטטוס טריגר-הבוקר של היום, עם Authorization תקין', async () => {
    vi.mocked(getDb).mockResolvedValue({
      getAllParticipants: async () => [
        {
          id: 'p1',
          full_name: 'ישראל ישראלי',
          phone: '+972501234567',
          signup_source_ref: 'ext-1',
          signup_at: '2026-08-02T10:00:00.000Z',
          day1_date: '2026-08-09',
          status: 'active',
          assigned_mentor_id: 'm1',
        },
      ],
      getDailyTriggersForDate: async () => [],
    } as never)

    const res = await GET(makeRequest('Bearer test-secret'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      participants: [
        {
          participantId: 'p1',
          fullName: 'ישראל ישראלי',
          phone: '+972501234567',
          status: 'active',
          day1Date: '2026-08-09',
          signupAt: '2026-08-02T10:00:00.000Z',
          signupSourceRef: 'ext-1',
          assignedMentorId: 'm1',
          triggerSentToday: false,
          clickedToday: false,
        },
      ],
    })
  })

  it('מסמן clickedToday=true כשיש טריגר-להיום עם clicked_at', async () => {
    vi.mocked(getDb).mockResolvedValue({
      getAllParticipants: async () => [
        {
          id: 'p1',
          full_name: 'ישראל ישראלי',
          phone: '+972501234567',
          signup_source_ref: null,
          signup_at: '2026-08-02T10:00:00.000Z',
          day1_date: '2026-08-09',
          status: 'active',
          assigned_mentor_id: null,
        },
      ],
      getDailyTriggersForDate: async () => [
        {
          id: 't1',
          participant_id: 'p1',
          calendar_date: '2026-08-16',
          content_day_number: 29,
          trigger_sent_at: '2026-08-16T03:45:00.000Z',
          clicked_at: '2026-08-16T07:02:00.000Z',
        },
      ],
    } as never)

    const res = await GET(makeRequest('Bearer test-secret'))
    const body = await res.json()

    expect(body.participants[0].triggerSentToday).toBe(true)
    expect(body.participants[0].clickedToday).toBe(true)
  })
})
