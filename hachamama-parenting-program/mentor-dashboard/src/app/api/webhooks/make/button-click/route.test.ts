// hachamama-parenting-program/mentor-dashboard/src/app/api/webhooks/make/button-click/route.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/engine/app-context', () => ({
  getDb: vi.fn(),
}))
vi.mock('@/engine/env', () => ({
  engineEnv: { MAKE_WEBHOOK_SECRET: 'test-secret' },
}))

import { getDb } from '@/engine/app-context'
import { POST } from './route'

function makeRequest(body: unknown, authHeader?: string): Request {
  return new Request('http://localhost/api/webhooks/make/button-click', {
    method: 'POST',
    headers: authHeader ? { authorization: authHeader } : {},
    body: JSON.stringify(body),
  })
}

describe('POST /api/webhooks/make/button-click', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockReset()
  })

  it('דוחה בלי Authorization תקין', async () => {
    const res = await POST(makeRequest({ phone: '+972501234567', buttonPayload: 'x' }, 'Bearer wrong'))
    expect(res.status).toBe(401)
  })

  it('מחזיר 404 כש-button_payload לא קיים', async () => {
    vi.mocked(getDb).mockResolvedValue({
      getDailyTrigger: async () => undefined,
    } as never)

    const res = await POST(
      makeRequest({ phone: '+972501234567', buttonPayload: 'missing-id' }, 'Bearer test-secret'),
    )
    expect(res.status).toBe(404)
  })

  it('מחזיר 403 כשהטלפון לא תואם את בעל ה-trigger', async () => {
    const trigger = { id: 't1', participant_id: 'p1', clicked_at: null }
    const participant = { id: 'p1', phone: '+972501111111' }
    vi.mocked(getDb).mockResolvedValue({
      getDailyTrigger: async () => trigger,
      getParticipant: async () => participant,
    } as never)

    const res = await POST(makeRequest({ phone: '+972502222222', buttonPayload: 't1' }, 'Bearer test-secret'))
    expect(res.status).toBe(403)
  })

  it('מסמן clicked_at, פותח session window, ומחזיר הודעות pending', async () => {
    const trigger = { id: 't1', participant_id: 'p1', clicked_at: null }
    const participant = { id: 'p1', phone: '+972501234567' }
    const markDailyTriggerClicked = vi.fn()
    const openOrExtendSessionWindow = vi.fn()
    const markDeliverySent = vi.fn()
    vi.mocked(getDb).mockResolvedValue({
      getDailyTrigger: async () => trigger,
      getParticipant: async () => participant,
      markDailyTriggerClicked,
      openOrExtendSessionWindow,
      getPendingDeliveriesForTrigger: async () => [{ id: 'd1', message_id: 'm1' }],
      getMessage: async () => ({ body_text: 'הי', media_url: null, media_type: null }),
      markDeliverySent,
    } as never)

    const res = await POST(makeRequest({ phone: '+972501234567', buttonPayload: 't1' }, 'Bearer test-secret'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ messages: [{ bodyText: 'הי', mediaUrl: null, mediaType: null }] })
    expect(markDailyTriggerClicked).toHaveBeenCalledWith('t1', expect.any(String))
    expect(openOrExtendSessionWindow).toHaveBeenCalledWith('p1', expect.any(String))
    expect(markDeliverySent).toHaveBeenCalledWith('d1', expect.any(String))
  })

  it('מזהה את בעל ה-trigger גם כש-Make שולח את הטלפון בלי + (כמו wa_id של Meta)', async () => {
    const trigger = { id: 't1', participant_id: 'p1', clicked_at: null }
    const participant = { id: 'p1', phone: '+972501234567' }
    vi.mocked(getDb).mockResolvedValue({
      getDailyTrigger: async () => trigger,
      getParticipant: async () => participant,
      markDailyTriggerClicked: vi.fn(),
      openOrExtendSessionWindow: vi.fn(),
      getPendingDeliveriesForTrigger: async () => [],
      markDeliverySent: vi.fn(),
    } as never)

    const res = await POST(makeRequest({ phone: '972501234567', buttonPayload: 't1' }, 'Bearer test-secret'))
    expect(res.status).toBe(200)
  })
})
