// hachamama-parenting-program/mentor-dashboard/src/app/api/webhooks/goal-answer/route.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/engine/app-context', () => ({
  getDb: vi.fn(),
}))
vi.mock('@/engine/env', () => ({
  engineEnv: { MAKE_WEBHOOK_SECRET: 'test-secret' },
}))
vi.mock('@/engine/domain/scheduling', () => ({
  calculateGoalMessageSendDate: vi.fn(() => '2023-01-08'),
  combineDateAndTimeInIsrael: vi.fn(() => new Date('2023-01-08T12:00:00.000Z')), // 14:00 בישראל בחורף
}))

import { getDb } from '@/engine/app-context'
import { POST } from './route'

function makeRequest(body: unknown, authHeader?: string): Request {
  return new Request('http://localhost/api/webhooks/goal-answer', {
    method: 'POST',
    headers: authHeader ? { authorization: authHeader } : {},
    body: JSON.stringify(body),
  })
}

const activeParticipant = { id: 'p1', phone: '+972501234567', status: 'active' }

describe('POST /api/webhooks/goal-answer', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockReset()
  })

  it('דוחה בקשה בלי Authorization תקין', async () => {
    const res = await POST(makeRequest({ phone: '0501234567', questionnaireNumber: 1, goalAnswer: 'יעד' }, 'Bearer wrong'))
    expect(res.status).toBe(401)
  })

  it('דוחה גוף בקשה לא תקין (goalAnswer חסר)', async () => {
    vi.mocked(getDb).mockResolvedValue({} as never)
    const res = await POST(makeRequest({ phone: '0501234567', questionnaireNumber: 1 }, 'Bearer test-secret'))
    expect(res.status).toBe(400)
  })

  it('מוצא נרשם לפי טלפון מקומי (0501234567) גם כשמאוחסן ב-E.164, ושומר goal_message', async () => {
    const createGoalMessage = vi.fn(async () => ({ id: 'gm1' }))
    vi.mocked(getDb).mockResolvedValue({
      getActiveParticipants: async () => [activeParticipant],
      createGoalMessage,
    } as never)

    const res = await POST(
      makeRequest({ phone: '0501234567', questionnaireNumber: 3, goalAnswer: 'לדבר יותר בשקט' }, 'Bearer test-secret'),
    )

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ goalMessageId: 'gm1', scheduledFor: '2023-01-08T12:00:00.000Z' })
    expect(createGoalMessage).toHaveBeenCalledWith({
      participantId: 'p1',
      questionnaireNumber: 3,
      goalAnswer: 'לדבר יותר בשקט',
      scheduledFor: '2023-01-08T12:00:00.000Z',
    })
  })

  it('מחזיר 404 כשהטלפון לא תואם אף נרשם פעיל', async () => {
    vi.mocked(getDb).mockResolvedValue({
      getActiveParticipants: async () => [activeParticipant],
    } as never)

    const res = await POST(
      makeRequest({ phone: '0509999999', questionnaireNumber: 1, goalAnswer: 'יעד' }, 'Bearer test-secret'),
    )

    expect(res.status).toBe(404)
  })
})
