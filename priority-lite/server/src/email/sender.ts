// שליחת מייל OTP — ממשק אחד, שני מימושים: console (פיתוח) ו-Resend (אמיתי).

export interface EmailSender {
  sendOtp(to: string, name: string, code: string): Promise<void>
}

export function createConsoleSender(): EmailSender {
  return {
    async sendOtp(to, name, code) {
      console.log(`\n========================================`)
      console.log(`  [מייל מדומה] OTP עבור ${name} <${to}>`)
      console.log(`  הקוד: ${code}`)
      console.log(`========================================\n`)
    },
  }
}

export function createResendSender(apiKey: string, from: string): EmailSender {
  return {
    async sendOtp(to, name, code) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `${code} — קוד הכניסה שלך ל-Priority Lite`,
          html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px">
            <p>שלום ${name},</p>
            <p>קוד הכניסה שלך הוא:</p>
            <p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p>
            <p>הקוד בתוקף ל-10 דקות.</p>
          </div>`,
        }),
      })
      if (!res.ok) {
        throw new Error(`שליחת מייל נכשלה (${res.status}): ${await res.text()}`)
      }
    },
  }
}
