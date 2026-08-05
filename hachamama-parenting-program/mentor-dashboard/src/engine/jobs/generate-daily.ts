// ריצה יומית (JIT) — לא בזמן ההרשמה. ראו design doc: "מנוע התזמון — Just-In-Time".
// תוכן שנערך היום חל אוטומטית על מי שעדיין לא הגיע לאותו יום, כי קוראים את התוכן
// העדכני כאן, לא בזמן ההרשמה.
import type { AppDB } from '../repository/interface.js'
import { calculateProgramDayNumber, combineDateAndTimeInIsrael } from '../domain/scheduling.js'

export interface GenerateDailyResult {
  triggersCreated: number
  deliveriesCreated: number
  participantsCompleted: number
  errors: Array<{ participantId: string; error: string }>
}

export async function generateDailyDeliveries(
  db: AppDB,
  todayDate: string,
  programLengthDays: number,
): Promise<GenerateDailyResult> {
  const participants = await db.getActiveParticipants()

  let triggersCreated = 0
  let deliveriesCreated = 0
  let participantsCompleted = 0
  const errors: GenerateDailyResult['errors'] = []

  for (const participant of participants) {
    // כל נרשם מבודד בלכידת שגיאות משלו — כשל בכתיבה עבור נרשם אחד (למשל שגיאת רשת
    // מול Supabase) לא אמור לעצור את הריצה כולה ולמנוע מכל הנרשמים האחרים לקבל תוכן.
    try {
      const dayNumber = calculateProgramDayNumber(participant.day1_date, todayDate)

      // completion נגזר מ-programLengthDays (משך קבוע וידוע מראש, ראו design doc),
      // לא ממספר content_days הקיימים כרגע ב-DB. תוקן ב-code review: הגרסה הקודמת
      // השתמשה ב-getMaxContentDayNumber() כתחליף ל"סוף התוכנית" — כשהתוכן נוצר
      // בהדרגה (Plan B, לא קיים עדיין), זה סימן כל הקבוצה הפעילה כ-completed
      // בפריסה טרייה שבה עדיין אין הרבה תוכן מאושר.
      if (dayNumber > programLengthDays) {
        await db.markParticipantCompleted(participant.id)
        participantsCompleted++
        continue
      }
      if (dayNumber < 1) continue // עדיין לא הגיע ה-day1_date שלו

      const contentDay = await db.getContentDay(dayNumber)
      // אין תוכן מוגדר ליום הזה (למשל "חור" בין ימי תוכן) — לא יוצרים כלום; הנרשם
      // יתעדכן ברגע שיגיע ליום שיש בו תוכן, בלי לתקוע את ההתקדמות שלו.
      if (!contentDay) continue

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
    } catch (err) {
      errors.push({ participantId: participant.id, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return { triggersCreated, deliveriesCreated, participantsCompleted, errors }
}
