// לקוח ל-custom webhook של Make.com — הצינור היחיד שמדבר בפועל עם WhatsApp (ראו design doc).
export interface MakeClient {
  sendMorningTrigger(input: {
    phone: string
    fullName: string
    dayOfWeekName: string
    weekNumber: number
    buttonPayload: string
  }): Promise<void>
  sendSessionMessage(input: {
    phone: string
    bodyText: string
    mediaUrl: string | null
    mediaType: string | null
  }): Promise<void>
}

// Make/WhatsApp מצפים למספר בלי '+' מוביל (כמו wa_id של Meta) — האחסון הפנימי
// שלנו נשאר E.164 מלא ("+972...") לכל דבר אחר; זה רק בשכבת השליחה ל-Make.
function stripLeadingPlus(phone: string): string {
  return phone.startsWith('+') ? phone.slice(1) : phone
}

export function createMakeClient(webhookUrl: string): MakeClient {
  return {
    async sendMorningTrigger(input) {
      await postToMake(webhookUrl, {
        kind: 'morning_trigger',
        isTemplate: true, // תבנית מאושרת + כפתור — לא הודעת session חופשית
        ...input,
        phone: stripLeadingPlus(input.phone),
      })
    },
    async sendSessionMessage(input) {
      await postToMake(webhookUrl, {
        kind: 'session_message',
        isTemplate: false,
        ...input,
        phone: stripLeadingPlus(input.phone),
      })
    },
  }
}

// בלי timeout, קריאה תקועה ל-Make חוסמת ריצת cron שלמה (drip רץ כל 5 דקות, פר-הודעה) —
// ראו הערת code review: זה סיכון תפעולי אמיתי, לא רק היגיינה.
const MAKE_REQUEST_TIMEOUT_MS = 10_000

async function postToMake(url: string, payload: unknown): Promise<void> {
  // בלי הבדיקה הזו, MAKE_WEBHOOK_URL ריק/שגוי נכשל בתוך fetch('') עם שגיאת URL
  // גנרית של Node ("Failed to parse URL from ") — לא ברור לאופרטור מה קרה בפועל
  // (ראו code review). מכשילים מוקדם עם הודעה שמצביעה בדיוק על מקור הבעיה.
  if (!url) {
    throw new Error('MAKE_WEBHOOK_URL לא מוגדר — לא ניתן לשלוח הודעות ל-WhatsApp')
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(MAKE_REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) {
    throw new Error(`Make webhook החזיר סטטוס ${res.status}`)
  }
}

export interface FakeMakeClient extends MakeClient {
  morningTriggersSent: Array<{ phone: string; fullName: string; dayOfWeekName: string; weekNumber: number; buttonPayload: string }>
  sessionMessagesSent: Array<{ phone: string; bodyText: string; mediaUrl: string | null; mediaType: string | null }>
}

/** תחליף-בדיקה ל-MakeClient — לא מבצע HTTP, רק רושם מה נשלח. לשימוש ב-jobs tests. */
export function createFakeMakeClient(): FakeMakeClient {
  const morningTriggersSent: FakeMakeClient['morningTriggersSent'] = []
  const sessionMessagesSent: FakeMakeClient['sessionMessagesSent'] = []
  return {
    morningTriggersSent,
    sessionMessagesSent,
    async sendMorningTrigger(input) {
      morningTriggersSent.push(input)
    },
    async sendSessionMessage(input) {
      sessionMessagesSent.push(input)
    },
  }
}
