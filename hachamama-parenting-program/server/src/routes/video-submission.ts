// לינק ציבורי רב-פעמי — נרשם מקליד טלפון ומעלה סרטון, בלי login. אין secret/header
// כאן בכוונה (בשונה מ-webhooks.ts) כי זה מיועד לאדם אמיתי בדפדפן, לא למערכת חיצונית —
// אימות ה"זהות" היחיד הוא התאמת מספר הטלפון לנרשם קיים.
import { Hono } from 'hono'
import type { AppContext } from '../context.js'

const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024 // 100MB — סרטון קצר מהטלפון, לא ל-YouTube
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm'])

// משווה מספרי טלפון בלי תלות בפורמט (מקומי "0501234567" מול E.164 "+972501234567") —
// משתמשים במספרי ה"סיגניפיקנט" הישראליים (9 ספרות אחרונות, בלי ה-0/972 המוביל)
// כדי שההשוואה תעבוד גם אם אחד הצדדים נשמר עם קידומת ואחד בלי.
function significantPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '').slice(-9)
}

const FORM_PAGE_HTML = `<!doctype html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><title>העלאת סרטון</title></head>
<body style="font-family: sans-serif; max-width: 400px; margin: 60px auto;">
  <h1>העלאת סרטון</h1>
  <form method="post" enctype="multipart/form-data">
    <label>מספר טלפון<br>
      <input type="tel" name="phone" required style="width: 100%; margin: 8px 0;">
    </label>
    <br>
    <label>קובץ סרטון<br>
      <input type="file" name="video" accept="video/*" required style="margin: 8px 0;">
    </label>
    <br>
    <button type="submit">שלח</button>
  </form>
</body>
</html>`

function errorPage(message: string): string {
  return `<!doctype html>
<html lang="he" dir="rtl"><body style="font-family: sans-serif; max-width: 400px; margin: 60px auto;">
<h1>שגיאה</h1><p>${message}</p>
</body></html>`
}

const SUCCESS_PAGE_HTML = `<!doctype html>
<html lang="he" dir="rtl"><body style="font-family: sans-serif; max-width: 400px; margin: 60px auto;">
<h1>התקבל!</h1><p>הסרטון הועלה בהצלחה.</p>
</body></html>`

export function createVideoSubmissionRoutes(ctx: AppContext) {
  const app = new Hono()

  app.get('/video-submit', (c) => c.html(FORM_PAGE_HTML))

  app.post('/video-submit', async (c) => {
    const body = await c.req.parseBody()
    const phone = body.phone
    const video = body.video

    if (typeof phone !== 'string' || !phone) {
      return c.html(errorPage('יש להזין מספר טלפון'), 400)
    }
    if (!(video instanceof File)) {
      return c.html(errorPage('יש לבחור קובץ סרטון'), 400)
    }
    if (!ALLOWED_VIDEO_TYPES.has(video.type)) {
      return c.html(errorPage('סוג הקובץ אינו נתמך — יש להעלות סרטון (mp4/mov/webm)'), 400)
    }
    if (video.size > MAX_VIDEO_SIZE_BYTES) {
      return c.html(errorPage(`הקובץ גדול מ-${MAX_VIDEO_SIZE_BYTES / (1024 * 1024)}MB`), 400)
    }

    const participants = await ctx.db.getActiveParticipants()
    const participant = participants.find((p) => significantPhoneDigits(p.phone) === significantPhoneDigits(phone))
    if (!participant) {
      return c.html(errorPage('מספר הטלפון לא נמצא — בדוק/י שהוקלד נכון'), 404)
    }

    const bytes = new Uint8Array(await video.arrayBuffer())
    const videoUrl = await ctx.videoStorage.upload(bytes, video.name, video.type)
    await ctx.db.createVideoSubmission({ participantId: participant.id, videoUrl })

    return c.html(SUCCESS_PAGE_HTML)
  })

  return app
}
