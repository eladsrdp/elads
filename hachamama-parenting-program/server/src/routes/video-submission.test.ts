import { describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { env } from '../env.js'
import { createFakeMakeClient } from '../make/client.js'
import { createLocalDb } from '../repository/local-impl.js'
import { createFakeVideoStorage } from '../storage/video-storage.js'

describe('GET /video-submit', () => {
  it('מחזיר עמוד HTML עם שדה טלפון וקלט קובץ', async () => {
    const app = createApp({ db: createLocalDb(), makeClient: createFakeMakeClient(), videoStorage: createFakeVideoStorage(), env })
    const res = await app.request('/video-submit')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('type="tel"')
    expect(html).toContain('type="file"')
  })
})

describe('POST /video-submit', () => {
  it('מספר טלפון לא מוכר מחזיר עמוד שגיאה, בלי להעלות כלום', async () => {
    const videoStorage = createFakeVideoStorage()
    const app = createApp({ db: createLocalDb(), makeClient: createFakeMakeClient(), videoStorage, env })

    const form = new FormData()
    form.set('phone', '+972500000099')
    form.set('video', new File([new Uint8Array([1, 2, 3])], 'clip.mp4', { type: 'video/mp4' }))

    const res = await app.request('/video-submit', { method: 'POST', body: form })

    expect(res.status).toBe(404)
    expect(videoStorage.uploaded).toHaveLength(0)
  })

  it('מספר טלפון מוכר + סרטון תקין: מעלה, שומר ב-DB, מחזיר עמוד הצלחה', async () => {
    const db = createLocalDb()
    const participant = await db.createParticipant({
      fullName: 'ישראל ישראלי',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2026-08-04T10:00:00.000Z',
      day1Date: '2026-08-09',
    })
    const videoStorage = createFakeVideoStorage()
    const app = createApp({ db, makeClient: createFakeMakeClient(), videoStorage, env })

    const form = new FormData()
    form.set('phone', '0501234567') // פורמט מקומי, לא E.164 — הראוט צריך לנרמל
    form.set('video', new File([new Uint8Array([1, 2, 3])], 'clip.mp4', { type: 'video/mp4' }))

    const res = await app.request('/video-submit', { method: 'POST', body: form })

    expect(res.status).toBe(200)
    expect(videoStorage.uploaded).toHaveLength(1)
    const html = await res.text()
    expect(html).toContain('התקבל')

    void participant
  })

  it('דוחה קובץ שאינו וידאו, בלי להעלות', async () => {
    const db = createLocalDb()
    await db.createParticipant({
      fullName: 'ישראל',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2026-08-04T10:00:00.000Z',
      day1Date: '2026-08-09',
    })
    const videoStorage = createFakeVideoStorage()
    const app = createApp({ db, makeClient: createFakeMakeClient(), videoStorage, env })

    const form = new FormData()
    form.set('phone', '+972501234567')
    form.set('video', new File([new Uint8Array([1, 2, 3])], 'not-a-video.exe', { type: 'application/x-msdownload' }))

    const res = await app.request('/video-submit', { method: 'POST', body: form })

    expect(res.status).toBe(400)
    expect(videoStorage.uploaded).toHaveLength(0)
  })
})
