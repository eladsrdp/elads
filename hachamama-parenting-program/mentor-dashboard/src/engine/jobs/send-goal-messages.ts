// ריצה יומית ב-14:00 (שעון ישראל) — שולחת הודעת מעקב מותאמת לתשובת "יעד" שהורה
// נתן בשאלון, לכל goal_message שהגיע תורו (scheduled_date=היום) וטרם נשלח.
// נוסח ההודעה אושר ע"י המשתמש (ראו vault) — טקסט חופשי, לא תבנית, כי היא רוכבת על
// אותו חלון-session שכבר פתוח בזכות ההודעות היומיות הרגילות של אותו יום.
import type { AppDB } from '../repository/interface'
import type { MakeClient } from '../make/client'

export interface SendGoalMessagesResult {
  sent: number
  errors: Array<{ goalMessageId: string; error: string }>
}

export function buildGoalFollowUpMessage(goalAnswer: string): string {
  return `כשיש כיוון ברור – הדרך נהיית פשוטה ומדויקת יותר. קביעת יעד היא הצהרת כוונות על מה שחשוב לכם כמשפחה השבוע.

המטרות שהצבתם לשבוע הקרוב:

🎯 ${goalAnswer}

מאמינים בכם ומחכים לראות את ההתקדמות!
שיהיה שבוע טוב ומשמעותי💪`
}

export async function sendGoalMessages(
  db: AppDB,
  makeClient: MakeClient,
  todayDate: string,
): Promise<SendGoalMessagesResult> {
  const dueMessages = await db.getDueGoalMessages(todayDate)
  let sent = 0
  const errors: SendGoalMessagesResult['errors'] = []

  for (const goalMessage of dueMessages) {
    // מבודד לכידת שגיאות פר-הודעה — כמו send-triggers, לא cover-חוזר של אותו
    // scheduled_date למחרת (getDueGoalMessages מסונן לפי תאריך מדויק).
    try {
      const participant = await db.getParticipant(goalMessage.participant_id)
      if (!participant) continue

      await makeClient.sendSessionMessage({
        phone: participant.phone,
        bodyText: buildGoalFollowUpMessage(goalMessage.goal_answer),
        mediaUrl: null,
        mediaType: null,
      })
      await db.markGoalMessageSent(goalMessage.id, new Date().toISOString())
      sent++
    } catch (err) {
      errors.push({ goalMessageId: goalMessage.id, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return { sent, errors }
}
