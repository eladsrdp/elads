// hachamama-parenting-program/server/src/make/client.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFakeMakeClient, createMakeClient } from './client'

describe('createMakeClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sendMorningTrigger שולח POST עם kind=morning_trigger ל-webhook URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    const client = createMakeClient('https://hook.make.com/abc')
    await client.sendMorningTrigger({ phone: '+972501234567', dayOfWeekName: 'שלישי', buttonPayload: 'trigger-1' })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://hook.make.com/abc',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          kind: 'morning_trigger',
          phone: '+972501234567',
          dayOfWeekName: 'שלישי',
          buttonPayload: 'trigger-1',
        }),
      }),
    )
  })

  it('sendSessionMessage שולח POST עם kind=session_message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    const client = createMakeClient('https://hook.make.com/abc')
    await client.sendSessionMessage({ phone: '+972501234567', bodyText: 'הי!', mediaUrl: null, mediaType: null })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [, options] = fetchMock.mock.calls[0]
    expect(JSON.parse(options.body).kind).toBe('session_message')
  })

  it('זורק שגיאה כש-Make מחזיר סטטוס לא תקין', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    const client = createMakeClient('https://hook.make.com/abc')
    await expect(
      client.sendSessionMessage({ phone: '+972501234567', bodyText: 'הי', mediaUrl: null, mediaType: null }),
    ).rejects.toThrow('500')
  })
})

describe('createFakeMakeClient', () => {
  it('רושם קריאות בלי לבצע HTTP אמיתי — לשימוש בבדיקות jobs', async () => {
    const fake = createFakeMakeClient()
    await fake.sendMorningTrigger({ phone: '+972501234567', dayOfWeekName: 'שני', buttonPayload: 't1' })
    expect(fake.morningTriggersSent).toHaveLength(1)
    expect(fake.morningTriggersSent[0].buttonPayload).toBe('t1')
  })
})
