// לקוח ל-custom webhook של Make.com — הצינור היחיד שמדבר בפועל עם WhatsApp (ראו design doc).
export interface MakeClient {
  sendMorningTrigger(input: { phone: string; dayOfWeekName: string; buttonPayload: string }): Promise<void>
  sendSessionMessage(input: {
    phone: string
    bodyText: string
    mediaUrl: string | null
    mediaType: string | null
  }): Promise<void>
}

export function createMakeClient(webhookUrl: string): MakeClient {
  return {
    async sendMorningTrigger(input) {
      await postToMake(webhookUrl, { kind: 'morning_trigger', ...input })
    },
    async sendSessionMessage(input) {
      await postToMake(webhookUrl, { kind: 'session_message', ...input })
    },
  }
}

// בלי timeout, קריאה תקועה ל-Make חוסמת ריצת cron שלמה (drip רץ כל 5 דקות, פר-הודעה) —
// ראו הערת code review: זה סיכון תפעולי אמיתי, לא רק היגיינה.
const MAKE_REQUEST_TIMEOUT_MS = 10_000

async function postToMake(url: string, payload: unknown): Promise<void> {
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
  morningTriggersSent: Array<{ phone: string; dayOfWeekName: string; buttonPayload: string }>
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
