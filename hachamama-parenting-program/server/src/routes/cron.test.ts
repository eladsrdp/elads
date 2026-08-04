// hachamama-parenting-program/server/src/routes/cron.test.ts
import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { env } from '../env'
import { createFakeMakeClient } from '../make/client'
import { createLocalDb } from '../repository/local-impl'
import { createFakeVideoStorage } from '../storage/video-storage'

describe('POST /api/cron/*', () => {
  it('כל שלושת ה-endpoints דוחים בלי CRON_SECRET תקין, ב-GET וב-POST', async () => {
    const app = createApp({ db: createLocalDb(), makeClient: createFakeMakeClient(), videoStorage: createFakeVideoStorage(), env })
    for (const path of ['generate-daily', 'send-triggers', 'drip']) {
      for (const method of ['GET', 'POST']) {
        const res = await app.request(`/api/cron/${path}`, { method })
        expect(res.status).toBe(401)
      }
    }
  })

  it('GET /generate-daily עובד גם — כך ש-Vercel Cron (שקורא רק ב-GET) יכול להפעיל את זה', async () => {
    const app = createApp({ db: createLocalDb(), makeClient: createFakeMakeClient(), videoStorage: createFakeVideoStorage(), env })

    const res = await app.request('/api/cron/generate-daily', {
      method: 'GET',
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ triggersCreated: 0, deliveriesCreated: 0, participantsCompleted: 0, errors: [] })
  })

  it('POST /generate-daily מריץ את הריצה היומית ומחזיר תוצאה', async () => {
    const db = createLocalDb()
    const app = createApp({ db, makeClient: createFakeMakeClient(), videoStorage: createFakeVideoStorage(), env })

    const res = await app.request('/api/cron/generate-daily', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ triggersCreated: 0, deliveriesCreated: 0, participantsCompleted: 0, errors: [] })
  })

  it('POST /send-triggers מריץ את שליחת הטריגרים ומחזיר תוצאה', async () => {
    const app = createApp({ db: createLocalDb(), makeClient: createFakeMakeClient(), videoStorage: createFakeVideoStorage(), env })

    const res = await app.request('/api/cron/send-triggers', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sent: 0, errors: [] })
  })

  it('POST /drip מריץ את ה-drip ומחזיר תוצאה', async () => {
    const app = createApp({ db: createLocalDb(), makeClient: createFakeMakeClient(), videoStorage: createFakeVideoStorage(), env })

    const res = await app.request('/api/cron/drip', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sent: 0, errors: [] })
  })
})
