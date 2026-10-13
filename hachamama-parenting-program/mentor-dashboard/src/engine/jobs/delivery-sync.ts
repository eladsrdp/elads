// משלים message_deliveries חסרים ל-trigger קיים, מול ה-messages שקיימות *עכשיו*
// ליום-התוכן שלו — לא מה שהיה קיים כש-generate-daily רץ. זה מה שמאפשר לערוך/להוסיף
// הודעות בכל שעה במהלך היום (גם אחרי שהטריגר נשלח, גם אחרי שנלחץ) בלי תלות בזמן
// ריצת ה-cron של 00:05. נקרא משני מקומות: בכל לחיצת כפתור (button-click route) וב-drip
// (לתפוס תוכן שנוסף אחרי שכבר נלחץ, בלי לחיצה נוספת).
import type { AppDB, DailyTriggerRow } from '../repository/interface'
import { combineDateAndTimeInIsrael } from '../domain/scheduling'

// הודעות שהרלוונטיות שלהן תלויה בזמן (תזכורת צהריים): נשלחות אך ורק למי שלחץ על כפתור
// הבוקר לפני שעת השליחה שלהן. מי שלחץ אחרי — לא מקבל אותן בדיעבד (לא נוצר להן delivery).
const SEND_ONLY_IF_CLICKED_BEFORE = new Set(['13:45'])

export function isSkippedForLateClick(sendOffsetTime: string, scheduledFor: string, clickedAt: string | null): boolean {
  if (!clickedAt || !SEND_ONLY_IF_CLICKED_BEFORE.has(sendOffsetTime.slice(0, 5))) return false
  return new Date(clickedAt).getTime() > new Date(scheduledFor).getTime()
}

export async function syncDeliveriesForTrigger(db: AppDB, trigger: DailyTriggerRow): Promise<number> {
  const [messages, existingDeliveries] = await Promise.all([
    db.getMessagesForContentDay(trigger.content_day_number),
    db.getDeliveriesForTrigger(trigger.id),
  ])
  const existingMessageIds = new Set(existingDeliveries.map((d) => d.message_id))

  let created = 0
  for (const message of messages) {
    if (existingMessageIds.has(message.id)) continue
    const scheduledFor = combineDateAndTimeInIsrael(trigger.calendar_date, message.send_offset_time).toISOString()
    if (isSkippedForLateClick(message.send_offset_time, scheduledFor, trigger.clicked_at)) continue
    await db.createMessageDelivery({
      participantId: trigger.participant_id,
      messageId: message.id,
      dailyTriggerId: trigger.id,
      scheduledFor,
    })
    created++
  }
  return created
}
