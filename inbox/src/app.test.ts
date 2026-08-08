// inbox/src/app.test.ts
import { describe, expect, it } from 'vitest'
import { createApp } from './app'
import { createDb } from './db'

const SELF_CHAT_ID = '972542438624@c.us'

function buildApp() {
  const db = createDb(':memory:')
  const app = createApp({ db, selfChatId: SELF_CHAT_ID })
  return { app, db }
}

function textMessagePayload(overrides: Record<string, unknown> = {}) {
  return {
    event: 'message',
    session: 'default',
    payload: {
      id: 'msg-1',
      timestamp: 1700000000,
      from: SELF_CHAT_ID,
      to: SELF_CHAT_ID,
      fromMe: false,
      body: 'שלום',
      type: 'chat',
      ...overrides,
    },
  }
}

function postWebhook(app: ReturnType<typeof createApp>, body: unknown) {
  return app.request('/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /webhook', () => {
  it('שומר הודעת טקסט מהצ׳אט הייעודי', async () => {
    const { app, db } = buildApp()
    const res = await postWebhook(app, textMessagePayload())
    expect(res.status).toBe(200)
    expect(db.countMessages()).toBe(1)
  })

  it('מתעלם מהודעה מצ׳אט אחר, עדיין מחזיר 200', async () => {
    const { app, db } = buildApp()
    const res = await postWebhook(
      app,
      textMessagePayload({ from: 'someone-else@c.us', to: 'someone-else@c.us' }),
    )
    expect(res.status).toBe(200)
    expect(db.countMessages()).toBe(0)
  })

  it('מתעלם מאירוע שאינו message, עדיין מחזיר 200', async () => {
    const { app, db } = buildApp()
    const res = await postWebhook(app, { event: 'state.change', payload: {} })
    expect(res.status).toBe(200)
    expect(db.countMessages()).toBe(0)
  })

  it('שומר הודעה קולית עם body=NULL', async () => {
    const { app, db } = buildApp()
    const res = await postWebhook(
      app,
      textMessagePayload({ id: 'msg-voice', type: 'ptt', body: undefined }),
    )
    expect(res.status).toBe(200)
    expect(db.countMessages()).toBe(1)
  })

  it('אותו waha_message_id פעמיים — נשארת שורה אחת', async () => {
    const { app, db } = buildApp()
    const payload = textMessagePayload()
    await postWebhook(app, payload)
    await postWebhook(app, payload)
    expect(db.countMessages()).toBe(1)
  })

  it('פיילוד לא תקין (JSON שגוי) לא קורס, מחזיר 200', async () => {
    const { app, db } = buildApp()
    const res = await app.request('/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not valid json',
    })
    expect(res.status).toBe(200)
    expect(db.countMessages()).toBe(0)
  })

  it('הודעה יוצאת (fromMe=true) נשמרת עם direction=outgoing', async () => {
    const { app, db } = buildApp()
    const res = await postWebhook(
      app,
      textMessagePayload({ id: 'msg-out', fromMe: true }),
    )
    expect(res.status).toBe(200)
    expect(db.countMessages()).toBe(1)
  })
})
