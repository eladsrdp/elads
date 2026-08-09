// inbox/src/app.ts
// הרכבת אפליקציית ה-Hono — מופרד מ-index.ts כדי שבדיקות יוכלו להרכיב app עם db משלהן.
import { Hono } from 'hono'
import type { Db, MessageType } from './db'

interface WahaWebhookPayload {
  event?: string
  payload?: {
    id?: string
    timestamp?: number
    from?: string
    to?: string
    fromMe?: boolean
    body?: string
    type?: string
  }
}

function toMessageType(wahaType: string | undefined): MessageType {
  if (wahaType === 'chat') return 'text'
  if (wahaType === 'ptt') return 'voice'
  return 'other'
}

export interface AppContext {
  db: Db
  selfChatId: string
}

export function createApp(ctx: AppContext) {
  const app = new Hono()

  app.get('/health', (c) => c.json({ ok: true }))

  app.post('/webhook', async (c) => {
    let body: WahaWebhookPayload
    try {
      body = await c.req.json()
    } catch {
      // SECURITY: פיילוד לא תקין לא אמור להפיל את השרת או לחשוף פרטים פנימיים — מחזירים 200 שקט.
      console.error('[inbox] webhook payload is not valid JSON')
      return c.json({ ok: true, skipped: 'invalid json' }, 200)
    }

    // JSON.parse מצליח על ערכים תקינים שאינם object (למשל "null", "42", "true") —
    // ה-catch שלמעלה לא תופס את זה, אז בודקים במפורש כדי לא לקרוס ב-body.payload למטה.
    if (body === null || typeof body !== 'object') {
      return c.json({ ok: true, skipped: 'unexpected payload shape' }, 200)
    }

    const payload = body.payload
    if (body.event !== 'message' || !payload?.id) {
      return c.json({ ok: true, skipped: 'not a message event' }, 200)
    }

    // בצ'אט לעצמי from/to שווים, אבל בכללי: chat id הוא from כשההודעה נכנסת, to כשהיא יוצאת.
    const chatId = payload.fromMe ? payload.to : payload.from
    if (chatId !== ctx.selfChatId) {
      return c.json({ ok: true, skipped: 'chat not tracked' }, 200)
    }

    const type = toMessageType(payload.type)

    try {
      const inserted = ctx.db.insertMessage({
        wahaMessageId: payload.id,
        direction: payload.fromMe ? 'outgoing' : 'incoming',
        type,
        body: type === 'text' ? (payload.body ?? null) : null,
        timestamp: payload.timestamp ?? Math.floor(Date.now() / 1000),
        rawJson: JSON.stringify(body),
      })
      return c.json({ ok: true, inserted }, 200)
    } catch (err) {
      // SECURITY: לוג מפורט בשרת בלבד, לא נחשף ללקוח (WAHA) — כדי לא לחשוף פרטי DB פנימיים.
      console.error('[inbox] failed to write message', err)
      return c.json({ ok: false }, 500)
    }
  })

  return app
}
