// ריצה בתדירות גבוהה (כל כמה דקות) — שולחת הודעות שהגיע זמנן, רק אם ה-daily_trigger
// שלהן נלחץ (שחרור per-day, ראו design doc) וגם קיים חלון-שירות טכני פתוח.
import type { AppDB } from '../repository/interface'
import type { MakeClient } from '../make/client'

export interface DripResult {
  sent: number
  errors: Array<{ deliveryId: string; error: string }>
}

export async function runDrip(db: AppDB, makeClient: MakeClient, now: string): Promise<DripResult> {
  const due = await db.getDuePendingDeliveriesWithClickedTrigger(now)
  let sent = 0
  const errors: DripResult['errors'] = []

  for (const delivery of due) {
    // כל delivery מבודד בלכידת שגיאות משלו — כשל בשליחה עבור delivery אחד (למשל
    // Make שמחזיר סטטוס שגיאה, או timeout) לא אמור לעצור את הריצה כולה ולמנוע
    // ממשתתפים אחרים לקבל את ההודעה שהגיע זמנה. בשונה מ-generate-daily, כאן
    // אין סיכון לאובדן מידע קבוע: ה-delivery נשאר pending ויילקח שוב בריצה הבאה
    // כל עוד החלון עדיין פתוח.
    //
    // מגבלה ידועה (flagged ב-code review, נדחתה בכוונה ל-Task 13): סמנטיקה של
    // at-least-once, לא exactly-once. אם sendSessionMessage מצליח בפועל אבל
    // markDeliverySent אחריו נכשל, ה-delivery נשאר pending וייתפס שוב בריצה
    // הבאה — כלומר הנרשם עלול לקבל את אותה הודעה פעמיים בפועל ב-WhatsApp. תיקון
    // אמיתי (סטטוס ביניים 'sending' + מדיניות timeout, או מפתח אידמפוטנטיות
    // ל-Make) דורש שינוי סכימה ונדון בכוונה ב-Task 13, לא כאן.
    try {
      const windowOpen = await db.isSessionWindowOpen(delivery.participant_id, now)
      if (!windowOpen) continue

      const participant = await db.getParticipant(delivery.participant_id)
      const message = await db.getMessage(delivery.message_id)
      if (!participant || !message) continue

      await makeClient.sendSessionMessage({
        phone: participant.phone,
        bodyText: message.body_text,
        mediaUrl: message.media_url,
        mediaType: message.media_type,
      })
      await db.markDeliverySent(delivery.id, now)
      sent++
    } catch (err) {
      errors.push({ deliveryId: delivery.id, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return { sent, errors }
}
