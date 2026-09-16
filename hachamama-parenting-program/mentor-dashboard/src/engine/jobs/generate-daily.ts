// ריצה יומית (JIT) — לא בזמן ההרשמה. ראו design doc: "מנוע התזמון — Just-In-Time".
// יוצרת רק את ה-daily_trigger (כדי שכפתור הבוקר יישלח) — לא את ה-message_deliveries.
// אלה נוצרים lazily ע"י syncDeliveriesForTrigger (delivery-sync.ts), שנקרא מה-click
// webhook ומ-drip, מול ה-messages שקיימות *באותו רגע*. זה מבטל את התלות ב"התוכן חייב
// להיות מוכן עד 00:05" — אפשר לערוך/להוסיף הודעות בכל שעה במהלך היום, גם אחרי
// שהטריגר כבר נשלח/נלחץ (ראו תקלת production 2026-09-14, vault, לסיבה שהניעה את זה).
import type { AppDB } from '../repository/interface'
import { calculateProgramDayNumber } from '../domain/scheduling'

export interface GenerateDailyResult {
  triggersCreated: number
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

      await db.createDailyTrigger({
        participantId: participant.id,
        calendarDate: todayDate,
        contentDayNumber: dayNumber,
      })
      triggersCreated++
    } catch (err) {
      errors.push({ participantId: participant.id, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return { triggersCreated, participantsCompleted, errors }
}
