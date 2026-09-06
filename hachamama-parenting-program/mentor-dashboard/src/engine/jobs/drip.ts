// ריצה בתדירות גבוהה (כל כמה דקות) — שולחת הודעות שהגיע זמנן, רק אם ה-daily_trigger
// שלהן נלחץ (שחרור per-day, ראו design doc) וגם קיים חלון-שירות טכני פתוח.
// כולל גם goal_messages (הודעת מעקב מותאמת לתשובת "יעד" בשאלון) — לא cron נפרד:
// אם המשתתף עוד לא לחץ על כפתור הבוקר עד scheduled_for (חלון סגור), ההודעה ממתינה
// ונשלחת ברצף עם שאר הודעות אותו יום ברגע שהוא סוף-סוף לוחץ, ממוין לפי זמן יחד
// עם ה-message_deliveries הרגילים — לא רק "מתישהו אחרי 14:00" בנפרד מהשאר.
import type { AppDB, GoalMessageRow, MessageDeliveryRow } from '../repository/interface'
import type { MakeClient } from '../make/client'

export interface DripResult {
  sent: number
  errors: Array<{ deliveryId: string; error: string }>
}

export function buildGoalFollowUpMessage(goalAnswer: string): string {
  return `כשיש כיוון ברור – הדרך נהיית פשוטה ומדויקת יותר. קביעת יעד היא הצהרת כוונות על מה שחשוב לכם כמשפחה השבוע.

המטרות שהצבתם לשבוע הקרוב:

🎯 ${goalAnswer}

מאמינים בכם ומחכים לראות את ההתקדמות!
שיהיה שבוע טוב ומשמעותי💪`
}

type DripTask =
  | { kind: 'delivery'; scheduledFor: string; delivery: MessageDeliveryRow }
  | { kind: 'goal'; scheduledFor: string; goalMessage: GoalMessageRow }

export async function runDrip(db: AppDB, makeClient: MakeClient, now: string): Promise<DripResult> {
  const [deliveries, goalMessages] = await Promise.all([
    db.getDuePendingDeliveriesWithClickedTrigger(now),
    db.getDueGoalMessages(now),
  ])

  // ממוינים יחד לפי scheduled_for — כך שגם אם הכל מצטבר כי המשתתף לחץ באיחור, הוא
  // מקבל את ההודעות (כולל הודעת היעד) בסדר הכרונולוגי הנכון, לא לפי מקור-הרשומה.
  const tasks: DripTask[] = [
    ...deliveries.map((delivery) => ({ kind: 'delivery' as const, scheduledFor: delivery.scheduled_for, delivery })),
    ...goalMessages.map((goalMessage) => ({ kind: 'goal' as const, scheduledFor: goalMessage.scheduled_for, goalMessage })),
  ].sort((a, b) => (a.scheduledFor < b.scheduledFor ? -1 : a.scheduledFor > b.scheduledFor ? 1 : 0))

  let sent = 0
  const errors: DripResult['errors'] = []

  for (const task of tasks) {
    // כל item מבודד בלכידת שגיאות משלו — כשל בשליחה עבור item אחד (למשל Make
    // שמחזיר סטטוס שגיאה, או timeout) לא אמור לעצור את הריצה כולה ולמנוע ממשתתפים
    // אחרים לקבל את ההודעה שהגיע זמנה. אין סיכון לאובדן מידע קבוע: ה-item נשאר
    // pending ויילקח שוב בריצה הבאה כל עוד החלון עדיין פתוח.
    //
    // מגבלה ידועה שנשארה פתוחה בכוונה (flagged ב-code review, לא נפתרה בפועל
    // בתוכנית הנוכחית — ראו server/README.md "מגבלות ידועות"): סמנטיקה של
    // at-least-once, לא exactly-once. אם sendSessionMessage מצליח בפועל אבל
    // markDeliverySent/markGoalMessageSent אחריו נכשל, ה-item נשאר pending וייתפס
    // שוב בריצה הבאה — כלומר הנרשם עלול לקבל את אותה הודעה פעמיים בפועל ב-WhatsApp.
    // תיקון אמיתי (סטטוס ביניים 'sending' + מדיניות timeout, או מפתח אידמפוטנטיות
    // ל-Make) דורש שינוי סכימה — משימה נפרדת, לא חלק מהתוכנית הזו.
    const participantId = task.kind === 'delivery' ? task.delivery.participant_id : task.goalMessage.participant_id
    const id = task.kind === 'delivery' ? task.delivery.id : task.goalMessage.id
    try {
      const windowOpen = await db.isSessionWindowOpen(participantId, now)
      if (!windowOpen) continue

      const participant = await db.getParticipant(participantId)
      if (!participant) continue

      if (task.kind === 'delivery') {
        const message = await db.getMessage(task.delivery.message_id)
        if (!message) continue
        await makeClient.sendSessionMessage({
          phone: participant.phone,
          bodyText: message.body_text,
          mediaUrl: message.media_url,
          mediaType: message.media_type,
        })
        await db.markDeliverySent(task.delivery.id, now)
      } else {
        await makeClient.sendSessionMessage({
          phone: participant.phone,
          bodyText: buildGoalFollowUpMessage(task.goalMessage.goal_answer),
          mediaUrl: null,
          mediaType: null,
        })
        await db.markGoalMessageSent(task.goalMessage.id, now)
      }
      sent++
    } catch (err) {
      errors.push({ deliveryId: id, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return { sent, errors }
}
