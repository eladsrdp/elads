// משלים message_deliveries חסרים ל-trigger קיים, מול ה-messages שקיימות *עכשיו*
// ליום-התוכן שלו — לא מה שהיה קיים כש-generate-daily רץ. זה מה שמאפשר לערוך/להוסיף
// הודעות בכל שעה במהלך היום (גם אחרי שהטריגר נשלח, גם אחרי שנלחץ) בלי תלות בזמן
// ריצת ה-cron של 00:05. נקרא משני מקומות: בכל לחיצת כפתור (button-click route) וב-drip
// (לתפוס תוכן שנוסף אחרי שכבר נלחץ, בלי לחיצה נוספת).
import type { AppDB, DailyTriggerRow } from '../repository/interface'
import { combineDateAndTimeInIsrael } from '../domain/scheduling'

export async function syncDeliveriesForTrigger(db: AppDB, trigger: DailyTriggerRow): Promise<number> {
  const [messages, existingDeliveries] = await Promise.all([
    db.getMessagesForContentDay(trigger.content_day_number),
    db.getDeliveriesForTrigger(trigger.id),
  ])
  const existingMessageIds = new Set(existingDeliveries.map((d) => d.message_id))

  let created = 0
  for (const message of messages) {
    if (existingMessageIds.has(message.id)) continue
    await db.createMessageDelivery({
      participantId: trigger.participant_id,
      messageId: message.id,
      dailyTriggerId: trigger.id,
      scheduledFor: combineDateAndTimeInIsrael(trigger.calendar_date, message.send_offset_time).toISOString(),
    })
    created++
  }
  return created
}
