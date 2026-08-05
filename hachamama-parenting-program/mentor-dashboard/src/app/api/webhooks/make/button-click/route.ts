// Make.com מעביר לחיצת כפתור בוקר לכאן. ראו design doc "עקרון מרכזי" — לחיצה
// משחררת רק את היום הספציפי הזה, לא כל pending שהצטבר.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/engine/app-context'
import { engineEnv } from '@/engine/env'

const ButtonClickSchema = z.object({
  phone: z.string().min(1),
  buttonPayload: z.string().min(1),
})

// Meta/WhatsApp שולח את wa_id בלי '+' (למשל "972501234567"), בעוד שההרשמה מאוחסנת
// ב-E.164 מלא ("+972501234567"). השוואת מחרוזות גולמית הייתה דוחה כל לחיצת כפתור
// אמיתית ב-403 — משווים רק ספרות.
function phoneDigitsOnly(phone: string): string {
  return phone.replace(/\D/g, '')
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${engineEnv.MAKE_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  const parsed = ButtonClickSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 })
  }

  const db = await getDb()

  const trigger = await db.getDailyTrigger(parsed.data.buttonPayload)
  if (!trigger) return NextResponse.json({ error: 'trigger לא נמצא' }, { status: 404 })

  const participant = await db.getParticipant(trigger.participant_id)
  if (!participant || phoneDigitsOnly(participant.phone) !== phoneDigitsOnly(parsed.data.phone)) {
    return NextResponse.json({ error: 'אימות נרשם נכשל' }, { status: 403 })
  }

  const now = new Date().toISOString()
  if (!trigger.clicked_at) {
    await db.markDailyTriggerClicked(trigger.id, now)
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  await db.openOrExtendSessionWindow(participant.id, expiresAt)

  const dueDeliveries = await db.getPendingDeliveriesForTrigger(trigger.id, now)
  const messages = []
  for (const delivery of dueDeliveries) {
    const message = await db.getMessage(delivery.message_id)
    messages.push({
      bodyText: message?.body_text ?? '',
      mediaUrl: message?.media_url ?? null,
      mediaType: message?.media_type ?? null,
    })
    await db.markDeliverySent(delivery.id, now)
  }

  return NextResponse.json({ messages })
}
