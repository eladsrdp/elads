// ריצת בוקר — שולחת ל-Make את הודעת הטריגר (תבנית מאושרת + כפתור) לכל daily_trigger
// שנוצר היום ועדיין לא נשלח. ה-button_payload הוא ה-id של ה-trigger עצמו — ראו design doc
// "עקרון מרכזי": לחיצה על הכפתור הזה תשחרר בעתיד רק את היום הספציפי הזה.
import type { AppDB } from '../repository/interface'
import type { MakeClient } from '../make/client'

export interface SendTriggersResult {
  sent: number
}

const DAY_OF_WEEK_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export async function sendMorningTriggers(
  db: AppDB,
  makeClient: MakeClient,
  todayDate: string,
): Promise<SendTriggersResult> {
  const triggers = await db.getUnsentDailyTriggers(todayDate)
  let sent = 0

  for (const trigger of triggers) {
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
  }

  return { sent }
}
