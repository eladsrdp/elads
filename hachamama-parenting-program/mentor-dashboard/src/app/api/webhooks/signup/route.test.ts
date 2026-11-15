// hachamama-parenting-program/mentor-dashboard/src/app/api/webhooks/signup/route.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/engine/app-context', () => ({
  getDb: vi.fn(),
}))
vi.mock('@/engine/env', () => ({
  engineEnv: { SIGNUP_WEBHOOK_SECRET: 'test-secret' },
}))

import { getDb } from '@/engine/app-context'
import { POST } from './route'

function makeRequest(body: unknown, authHeader?: string): Request {
  return new Request('http://localhost/api/webhooks/signup', {
    method: 'POST',
    headers: authHeader ? { authorization: authHeader } : {},
    body: JSON.stringify(body),
  })
}

describe('POST /api/webhooks/signup', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockReset()
  })

  it('דוחה בקשה בלי Authorization תקין', async () => {
    const res = await POST(makeRequest({ fullName: 'ישראל', phone: '+972501234567' }, 'Bearer wrong'))
    expect(res.status).toBe(401)
  })

  it('יוצר נרשם עם day1Date, עם Authorization תקין', async () => {
    const created = { id: 'p1', day1_date: '2026-08-09' }
    vi.mocked(getDb).mockResolvedValue({
      findParticipantByPhone: async () => undefined,
      createParticipant: async () => created,
    } as never)

    const res = await POST(
      makeRequest(
        { fullName: 'ישראל ישראלי', phone: '+972501234567', signupSourceRef: 'ext-1' },
        'Bearer test-secret',
      ),
    )

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ participantId: 'p1', day1Date: '2026-08-09' })
  })

  it('מעביר timezone תקין ל-createParticipant, ומחשב day1Date לפי האזור', async () => {
    const createParticipant = vi.fn(async () => ({ id: 'p2', day1_date: '2026-08-09' }))
    vi.mocked(getDb).mockResolvedValue({ findParticipantByPhone: async () => undefined, createParticipant } as never)

    const res = await POST(
      makeRequest({ fullName: 'שרה', phone: '+13475550100', timezone: 'America/New_York' }, 'Bearer test-secret'),
    )

    expect(res.status).toBe(201)
    expect(createParticipant).toHaveBeenCalledWith(expect.objectContaining({ timezone: 'America/New_York' }))
  })

  it('דוחה timezone לא תקין ב-400', async () => {
    vi.mocked(getDb).mockResolvedValue({ findParticipantByPhone: async () => undefined } as never)
    const res = await POST(
      makeRequest({ fullName: 'שרה', phone: '+13475550100', timezone: 'Mars/Olympus' }, 'Bearer test-secret'),
    )
    expect(res.status).toBe(400)
  })

  it('הרשמה כפולה עם אותו טלפון היא idempotent — מחזירה 200 בלי ליצור כפול', async () => {
    const existing = { id: 'p1', day1_date: '2026-08-09' }
    const createParticipant = vi.fn()
    vi.mocked(getDb).mockResolvedValue({
      findParticipantByPhone: async () => existing,
      createParticipant,
    } as never)

    const res = await POST(
      makeRequest({ fullName: 'ישראל ישראלי', phone: '+972501234567' }, 'Bearer test-secret'),
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ participantId: 'p1', day1Date: '2026-08-09' })
    expect(createParticipant).not.toHaveBeenCalled()
  })

  it('דוחה גוף בקשה לא תקין (טלפון חסר)', async () => {
    vi.mocked(getDb).mockResolvedValue({} as never)
    const res = await POST(makeRequest({ fullName: 'ישראל' }, 'Bearer test-secret'))
    expect(res.status).toBe(400)
  })
})
