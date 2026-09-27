// Webhook תשובת "יעד" בשאלון — Make.com קורא לזה בכל מילוי שאלון (כל שגרות השאלון
// חולקות את אותו webhook, לא endpoint נפרד לכל שגרה). מתזמן הודעת מעקב מותאמת
// (scheduled_for = 14:00 בתאריך המחושב) — נשלחת בפועל ע"י drip.ts, לא ע"י cron נפרד:
// אם המשתתף עוד לא לחץ על כפתור הבוקר עד 14:00 (חלון-session סגור), ההודעה ממתינה
// ונשלחת ברצף עם שאר הודעות אותו יום ברגע שהוא סוף-סוף לוחץ (drip רץ כל 5 דק').
// SECURITY: חשוף לאינטרנט, מוגן בסוד משותף (אותו MAKE_WEBHOOK_SECRET כמו button-click —
// אותו צרכן, Make.com, כבר מחזיק אותו).
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { calculateGoalMessageSendDate, combineDateAndTimeInIsrael } from '@/engine/domain/scheduling'
import { getDb } from '@/engine/app-context'
import { engineEnv } from '@/engine/env'

const GOAL_MESSAGE_SEND_TIME = '14:00'

const GoalAnswerSchema = z.object({
  phone: z.string().min(1),
  questionnaireNumber: z.number().int().positive(),
  goalAnswer: z.string().min(1).max(2000),
})

// משווה מספרי טלפון בלי תלות בפורמט (מקומי "0501234567" מול E.164 "+972501234567") —
// זהה ל-video-submit/actions.ts (כפילות מכוונת וקטנה, לא shared package — ראו YAGNI
// documented שם ובעוד כמה מקומות בפרויקט הזה).
function significantPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '').slice(-9)
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${engineEnv.MAKE_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  const parsed = GoalAnswerSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 })
  }

  const db = await getDb()
  const participants = await db.getActiveParticipants()
  const participant = participants.find(
    (p) => significantPhoneDigits(p.phone) === significantPhoneDigits(parsed.data.phone),
  )
  if (!participant) {
    return NextResponse.json({ error: 'מספר הטלפון לא נמצא' }, { status: 404 })
  }

  const scheduledDate = calculateGoalMessageSendDate(new Date())
  const scheduledFor = combineDateAndTimeInIsrael(scheduledDate, GOAL_MESSAGE_SEND_TIME).toISOString()
  const goalMessage = await db.createGoalMessage({
    participantId: participant.id,
    questionnaireNumber: parsed.data.questionnaireNumber,
    goalAnswer: parsed.data.goalAnswer,
    scheduledFor,
  })

  return NextResponse.json({ goalMessageId: goalMessage.id, scheduledFor }, { status: 201 })
}
