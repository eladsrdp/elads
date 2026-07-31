// hachamama-parenting-program/server/src/routes/webhooks.test.ts
import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { env } from '../env'
import { createFakeMakeClient } from '../make/client'
import { createLocalDb } from '../repository/local-impl'

function buildApp() {
  const db = createLocalDb()
  const makeClient = createFakeMakeClient()
  const app = createApp({ db, makeClient, env })
  return { app, db, makeClient }
}

describe('POST /api/webhooks/signup', () => {
  it('דוחה בקשה בלי Authorization תקין', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/webhooks/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fullName: 'ישראל', phone: '+972501234567' }),
    })
    expect(res.status).toBe(401)
  })

  it('יוצר נרשם עם day1_date מחושב, עם Authorization תקין', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/webhooks/signup', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.SIGNUP_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({ fullName: 'ישראל ישראלי', phone: '+972501234567', signupSourceRef: 'ext-1' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.participantId).toBeTruthy()
    expect(body.day1Date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('דוחה גוף בקשה לא תקין (טלפון חסר)', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/webhooks/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.SIGNUP_WEBHOOK_SECRET}` },
      body: JSON.stringify({ fullName: 'ישראל' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/webhooks/make/button-click', () => {
  it('דוחה בלי Authorization תקין', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/webhooks/make/button-click', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '+972501234567', buttonPayload: 'x' }),
    })
    expect(res.status).toBe(401)
  })

  it('מחזיר 404 כש-button_payload לא קיים', async () => {
    const { app } = buildApp()
    const res = await app.request('/api/webhooks/make/button-click', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.MAKE_WEBHOOK_SECRET}` },
      body: JSON.stringify({ phone: '+972501234567', buttonPayload: 'missing-id' }),
    })
    expect(res.status).toBe(404)
  })

  it('מחזיר 403 כשהטלפון לא תואם את בעל ה-trigger', async () => {
    const { app, db } = buildApp()
    const participant = await db.createParticipant({
      fullName: 'א',
      phone: '+972501111111',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    const trigger = await db.createDailyTrigger({
      participantId: participant.id,
      calendarDate: '2023-01-08',
      contentDayNumber: 1,
    })

    const res = await app.request('/api/webhooks/make/button-click', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.MAKE_WEBHOOK_SECRET}` },
      body: JSON.stringify({ phone: '+972502222222', buttonPayload: trigger.id }),
    })
    expect(res.status).toBe(403)
  })

  it('מסמן clicked_at, פותח session window, ומחזיר רק הודעות שכבר הגיע זמנן לאותו trigger', async () => {
    const { app, db } = buildApp()
    const participant = await db.createParticipant({
      fullName: 'ישראל',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    const trigger = await db.createDailyTrigger({
      participantId: participant.id,
      calendarDate: '2023-01-08',
      contentDayNumber: 1,
    })
    const early = await db.createMessage({
      contentDayNumber: 1,
      sendOffsetTime: '05:00',
      orderInDay: 1,
      bodyText: 'הודעה מוקדמת',
      mediaUrl: null,
      mediaType: null,
    })
    await db.createMessageDelivery({
      participantId: participant.id,
      messageId: early.id,
      dailyTriggerId: trigger.id,
      // הראוט משתמש בזמן אמת (new Date()), לא בזמן מוזרק — לכן התאריכים כאן
      // חייבים להיות יחסיים ל-Date.now() בפועל, לא תאריכים קבועים מהעבר/עתיד.
      scheduledFor: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // לפני שעה — עבר
    })
    const late = await db.createMessage({
      contentDayNumber: 1,
      sendOffsetTime: '20:00',
      orderInDay: 2,
      bodyText: 'הודעה מאוחרת',
      mediaUrl: null,
      mediaType: null,
    })
    await db.createMessageDelivery({
      participantId: participant.id,
      messageId: late.id,
      dailyTriggerId: trigger.id,
      scheduledFor: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // בעוד שעה — עתיד
    })

    const res = await app.request('/api/webhooks/make/button-click', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.MAKE_WEBHOOK_SECRET}` },
      body: JSON.stringify({ phone: '+972501234567', buttonPayload: trigger.id }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.messages).toEqual([{ bodyText: 'הודעה מוקדמת', mediaUrl: null, mediaType: null }])

    const updatedTrigger = await db.getDailyTrigger(trigger.id)
    expect(updatedTrigger?.clicked_at).toBeTruthy()
    expect(await db.isSessionWindowOpen(participant.id, new Date().toISOString())).toBe(true)
  })
})
