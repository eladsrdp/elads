// Webhooks חיצוניים — הרשמה (ממערכת צד-שלישי) ולחיצת כפתור (מ-Make.com).
// SECURITY: שני ה-endpoints האלה חשופים לאינטרנט וכותבים ל-DB — מוגנים בסוד משותף
// ב-Authorization header, לא רק CORS/רשת. בלי זה כל אחד יכול ליצור נרשמים בדויים
// או "ללחוץ כפתורים" בשם נרשמים אחרים.
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppContext } from '../context'
import { calculateDay1Date } from '../domain/scheduling'

const SignupSchema = z.object({
  fullName: z.string().min(1).max(200),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'טלפון חייב להיות בפורמט E.164, למשל +972501234567'),
  signupSourceRef: z.string().max(200).optional(),
})

const ButtonClickSchema = z.object({
  phone: z.string().min(1),
  buttonPayload: z.string().min(1),
})

// Meta/WhatsApp שולח את wa_id בלי '+' (למשל "972501234567"), בעוד שההרשמה מאוחסנת
// ב-E.164 מלא ("+972501234567") לפי SignupSchema. השוואת מחרוזות גולמית הייתה
// דוחה כל לחיצת כפתור אמיתית ב-403 — משווים רק ספרות. ראו code review.
function phoneDigitsOnly(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function createWebhookRoutes(ctx: AppContext) {
  const app = new Hono()

  app.post('/signup', async (c) => {
    const auth = c.req.header('authorization')
    if (auth !== `Bearer ${ctx.env.SIGNUP_WEBHOOK_SECRET}`) return c.json({ error: 'לא מורשה' }, 401)

    const parsed = SignupSchema.safeParse(await c.req.json())
    if (!parsed.success) return c.json({ error: 'גוף בקשה לא תקין' }, 400)

    // idempotent לפי טלפון — ה-DB אוכף unique על phone (ראו migrations/0001_init.sql).
    // בלי הבדיקה הזו, webhook כפול (retry ממערכת ההרשמה החיצונית) היה נכשל ב-Supabase
    // עם unique violation → 500, ובלי unique constraint ב-local-impl היה יוצר נרשם
    // כפול בשקט. ראו code review בסיום התוכנית.
    const existing = await ctx.db.findParticipantByPhone(parsed.data.phone)
    if (existing) {
      return c.json({ participantId: existing.id, day1Date: existing.day1_date }, 200)
    }

    const signupAt = new Date().toISOString()
    const day1Date = calculateDay1Date(new Date(signupAt))

    const participant = await ctx.db.createParticipant({
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      signupSourceRef: parsed.data.signupSourceRef ?? null,
      signupAt,
      day1Date,
    })

    return c.json({ participantId: participant.id, day1Date: participant.day1_date }, 201)
  })

  app.post('/make/button-click', async (c) => {
    const auth = c.req.header('authorization')
    if (auth !== `Bearer ${ctx.env.MAKE_WEBHOOK_SECRET}`) return c.json({ error: 'לא מורשה' }, 401)

    const parsed = ButtonClickSchema.safeParse(await c.req.json())
    if (!parsed.success) return c.json({ error: 'גוף בקשה לא תקין' }, 400)

    const trigger = await ctx.db.getDailyTrigger(parsed.data.buttonPayload)
    if (!trigger) return c.json({ error: 'trigger לא נמצא' }, 404)

    const participant = await ctx.db.getParticipant(trigger.participant_id)
    if (!participant || phoneDigitsOnly(participant.phone) !== phoneDigitsOnly(parsed.data.phone)) {
      return c.json({ error: 'אימות נרשם נכשל' }, 403)
    }

    const now = new Date().toISOString()
    if (!trigger.clicked_at) {
      await ctx.db.markDailyTriggerClicked(trigger.id, now)
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    await ctx.db.openOrExtendSessionWindow(participant.id, expiresAt)

    // מגבלה ידועה (flagged ב-code review, לא נפתרה בפועל): כאן markDeliverySent
    // נקרא בזמן *בניית* התשובה, לפני שידוע אם Make בפועל שלח את ההודעה — at-most-once
    // עם סיכון אובדן שקט אם ה-HTTP response ל-Make לא מגיע/ה-scenario נכשל. זו
    // הסמנטיקה ההפוכה מ-drip.ts (at-least-once, ראו ההערה שם) — שני מסלולים
    // שונים לאותה טבלה, בכוונה לא אוחדו. ראו server/README.md "מגבלות ידועות".
    const dueDeliveries = await ctx.db.getPendingDeliveriesForTrigger(trigger.id, now)
    const messages = []
    for (const delivery of dueDeliveries) {
      const message = await ctx.db.getMessage(delivery.message_id)
      messages.push({
        bodyText: message?.body_text ?? '',
        mediaUrl: message?.media_url ?? null,
        mediaType: message?.media_type ?? null,
      })
      await ctx.db.markDeliverySent(delivery.id, now)
    }

    return c.json({ messages })
  })

  return app
}
