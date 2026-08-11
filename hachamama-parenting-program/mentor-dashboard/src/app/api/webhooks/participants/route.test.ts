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

  it('מחזיר את כל הנרשמים עם Authorization תקין', async () => {
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
        },
      ],
    })
  })
})
