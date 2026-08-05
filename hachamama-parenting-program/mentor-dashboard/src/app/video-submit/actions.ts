// לינק ציבורי רב-פעמי — נרשם מקליד טלפון ומעלה סרטון, בלי login. אין secret/header
// כאן בכוונה (בשונה מ-webhooks) כי זה מיועד לאדם אמיתי בדפדפן, לא למערכת חיצונית —
// אימות ה"זהות" היחיד הוא התאמת מספר הטלפון לנרשם קיים.
'use server'

import { getDb, getVideoStorage } from '@/engine/app-context'

const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024 // 100MB — סרטון קצר מהטלפון, לא ל-YouTube
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm'])

// משווה מספרי טלפון בלי תלות בפורמט (מקומי "0501234567" מול E.164 "+972501234567") —
// משתמשים במספרי ה"סיגניפיקנט" הישראליים (9 ספרות אחרונות, בלי ה-0/972 המוביל)
// כדי שההשוואה תעבוד גם אם אחד הצדדים נשמר עם קידומת ואחד בלי.
function significantPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '').slice(-9)
}

export type SubmitVideoResult = { ok: true } | { ok: false; error: string }

export async function submitVideo(formData: FormData): Promise<SubmitVideoResult> {
  const phone = formData.get('phone')
  const video = formData.get('video')

  if (typeof phone !== 'string' || !phone) {
    return { ok: false, error: 'יש להזין מספר טלפון' }
  }
  if (!(video instanceof File) || !video.size) {
    return { ok: false, error: 'יש לבחור קובץ סרטון' }
  }
  if (!ALLOWED_VIDEO_TYPES.has(video.type)) {
    return { ok: false, error: 'סוג הקובץ אינו נתמך — יש להעלות סרטון (mp4/mov/webm)' }
  }
  if (video.size > MAX_VIDEO_SIZE_BYTES) {
    return { ok: false, error: `הקובץ גדול מ-${MAX_VIDEO_SIZE_BYTES / (1024 * 1024)}MB` }
  }

  const db = await getDb()
  const participants = await db.getActiveParticipants()
  const participant = participants.find((p) => significantPhoneDigits(p.phone) === significantPhoneDigits(phone))
  if (!participant) {
    return { ok: false, error: 'מספר הטלפון לא נמצא — בדוק/י שהוקלד נכון' }
  }

  const bytes = new Uint8Array(await video.arrayBuffer())
  const videoUrl = await getVideoStorage().upload(bytes, video.name, video.type)
  await db.createVideoSubmission({ participantId: participant.id, videoUrl })

  return { ok: true }
}
