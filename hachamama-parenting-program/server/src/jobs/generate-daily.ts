// ריצה יומית (JIT) — לא בזמן ההרשמה. ראו design doc: "מנוע התזמון — Just-In-Time".
// תוכן שנערך היום חל אוטומטית על מי שעדיין לא הגיע לאותו יום, כי קוראים את התוכן
// העדכני כאן, לא בזמן ההרשמה.
import type { AppDB } from '../repository/interface'
import { calculateProgramDayNumber, combineDateAndTimeInIsrael } from '../domain/scheduling'

export interface GenerateDailyResult {
  triggersCreated: number
  deliveriesCreated: number
  participantsCompleted: number
}

export async function generateDailyDeliveries(db: AppDB, todayDate: string): Promise<GenerateDailyResult> {
  const participants = await db.getActiveParticipants()
  const maxDay = await db.getMaxContentDayNumber()

  let triggersCreated = 0
  let deliveriesCreated = 0
  let participantsCompleted = 0

  for (const participant of participants) {
    const dayNumber = calculateProgramDayNumber(participant.day1_date, todayDate)

    if (dayNumber > maxDay) {
      await db.markParticipantCompleted(participant.id)
      participantsCompleted++
      continue
    }
    if (dayNumber < 1) continue // עדיין לא הגיע ה-day1_date שלו

    const contentDay = await db.getContentDay(dayNumber)
    if (!contentDay) continue // אין תוכן מוגדר ליום הזה — לא יוצרים כלום

    const existingTrigger = await db.findDailyTrigger(participant.id, todayDate)
    if (existingTrigger) continue // אידמפוטנטי — כבר רץ היום עבור הנרשם הזה

    const trigger = await db.createDailyTrigger({
      participantId: participant.id,
      calendarDate: todayDate,
      contentDayNumber: dayNumber,
    })
    triggersCreated++

    const messages = await db.getMessagesForContentDay(dayNumber)
    for (const message of messages) {
      const scheduledFor = combineDateAndTimeInIsrael(todayDate, message.send_offset_time).toISOString()
      await db.createMessageDelivery({
        participantId: participant.id,
        messageId: message.id,
        dailyTriggerId: trigger.id,
        scheduledFor,
      })
      deliveriesCreated++
    }
  }

  return { triggersCreated, deliveriesCreated, participantsCompleted }
}
