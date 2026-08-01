// ריצת בוקר — שולחת ל-Make את הודעת הטריגר (תבנית מאושרת + כפתור) לכל daily_trigger
// שנוצר היום ועדיין לא נשלח. ה-button_payload הוא ה-id של ה-trigger עצמו — ראו design doc
// "עקרון מרכזי": לחיצה על הכפתור הזה תשחרר בעתיד רק את היום הספציפי הזה.
import type { AppDB } from '../repository/interface.js'
import type { MakeClient } from '../make/client.js'

export interface SendTriggersResult {
  sent: number
  errors: Array<{ dailyTriggerId: string; error: string }>
}

const DAY_OF_WEEK_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export async function sendMorningTriggers(
  db: AppDB,
  makeClient: MakeClient,
  todayDate: string,
): Promise<SendTriggersResult> {
  const triggers = await db.getUnsentDailyTriggers(todayDate)
  let sent = 0
  const errors: SendTriggersResult['errors'] = []

  for (const trigger of triggers) {
    // מבודד לכידת שגיאות פר-trigger — שלא כמו generate-daily/drip, הריצה הזו לא
    // חוזרת על אותו תאריך למחרת (getUnsentDailyTriggers מסונן לפי calendar_date מדויק),
    // אז כשל שלא נבלע יבטל את שאר הריצה בלי אף הזדמנות תיקון עצמי.
    try {
      const participant = await db.getParticipant(trigger.participant_id)
      if (!participant) continue

      const dayOfWeekName = DAY_OF_WEEK_HE[new Date(`${trigger.calendar_date}T00:00:00Z`).getUTCDay()]

      await makeClient.sendMorningTrigger({
        phone: participant.phone,
        dayOfWeekName,
        buttonPayload: trigger.id,
      })
      await db.markDailyTriggerSent(trigger.id, new Date().toISOString())
      sent++
    } catch (err) {
      errors.push({ dailyTriggerId: trigger.id, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return { sent, errors }
}
