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
    fromMe?: boolean
    body?: string
    hasMedia?: boolean
    media?: { mimetype?: string } | null
  }
}

// אין שדה 'type' בפיילוד האמיתי של מנוע NOWEB (אומת מול payload חי) — הסיווג נעשה לפי
// hasMedia/media.mimetype. מיפוי ה-voice (audio/*) עדיין לא אומת מול הקלטה קולית אמיתית —
// ראה Open Questions ב-vault, נדחה בכוונה לבדיקה מאוחרת יותר.
function toMessageType(payload: { hasMedia?: boolean; media?: { mimetype?: string } | null }): MessageType {
  if (!payload.hasMedia) return 'text'
  if (payload.media?.mimetype?.startsWith('audio/')) return 'voice'
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

    // WAHA's 'message' event fires only for incoming messages; 'message.any' fires for both
    // directions (including our own fromMe=true sends) — נדרש כי אנחנו קולטים גם הודעות יוצאות.
    const payload = body.payload
    if (body.event !== 'message.any' || !payload?.id) {
      return c.json({ ok: true, skipped: 'not a message event' }, 200)
    }

    // payload.from הוא ה-chat (remoteJid) שההודעה משויכת אליו, בלי קשר לכיוון —
    // payload.to לא קיים בכלל בפועל כשfromMe=true (אומת מול פיילוד אמיתי מ-WAHA), אז אין להסתמך עליו.
    const chatId = payload.from
    if (chatId !== ctx.selfChatId) {
      return c.json({ ok: true, skipped: 'chat not tracked' }, 200)
    }

    const type = toMessageType(payload)

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
