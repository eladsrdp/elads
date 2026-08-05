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

// עיצוב לפי brand/brand-guidelines.md — פלטה נדגמה בפיקסלים מ-logo.png, לא הערכת עין.
// הלוגו מאוחסן ב-Supabase Storage (bucket 'media', ציבורי לקריאה) — הועלה פעם אחת
// דרך script חד-פעמי, לא חלק מקוד הריצה. אם הלוגו יתעדכן, יש להעלות מחדש לאותו path.
const LOGO_URL = 'https://lqhpfrhiiboshsoqnfdz.supabase.co/storage/v1/object/public/media/branding/logo-full.jpg'
const COLOR_GREEN_DARK = '#2F5F47'
const COLOR_GREEN_MUTED = '#789084'
const COLOR_COPPER = '#8B481C'
const COLOR_PAPER = '#F3F3F3'

function pageShell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, "Segoe UI", Arial, sans-serif;
      background: ${COLOR_PAPER};
      color: ${COLOR_GREEN_DARK};
      margin: 0;
      padding: 24px 16px;
      display: flex;
      justify-content: center;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 2px 12px rgba(47, 95, 71, 0.12);
      padding: 32px 24px;
      max-width: 360px;
      width: 100%;
      text-align: center;
    }
    .logo { width: 100%; max-width: 280px; height: auto; margin-bottom: 16px; }
    h1 { font-size: 20px; margin: 0 0 6px; color: ${COLOR_GREEN_DARK}; }
    .tagline { font-size: 13px; color: ${COLOR_GREEN_MUTED}; margin: 0 0 20px; }
    label { display: block; text-align: right; font-size: 14px; margin: 16px 0 6px; color: ${COLOR_GREEN_DARK}; }
    input[type="tel"], input[type="file"] {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid ${COLOR_GREEN_MUTED};
      border-radius: 10px;
      font-size: 15px;
      background: ${COLOR_PAPER};
    }
    input[type="tel"]:focus { outline: 2px solid ${COLOR_GREEN_DARK}; }
    button {
      width: 100%;
      margin-top: 24px;
      padding: 12px;
      background: ${COLOR_GREEN_DARK};
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      cursor: pointer;
    }
    button:active { opacity: 0.85; }
    .icon { font-size: 40px; margin-bottom: 8px; }
    .error-text { color: ${COLOR_COPPER}; font-size: 15px; }
    .success-text { color: ${COLOR_GREEN_DARK}; font-size: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <img class="logo" src="${LOGO_URL}" alt="החממה">
    ${bodyHtml}
  </div>
</body>
</html>`
}

const FORM_PAGE_HTML = pageShell(
  'העלאת סרטון — החממה',
  `
    <h1>העלאת סרטון</h1>
    <p class="tagline">הדרך לגדול עם שרה גוטליב</p>
    <form method="post" enctype="multipart/form-data">
      <label for="phone">מספר טלפון</label>
      <input type="tel" id="phone" name="phone" placeholder="050-1234567" required>
      <label for="video">קובץ סרטון</label>
      <input type="file" id="video" name="video" accept="video/*" required>
      <button type="submit">שלח</button>
    </form>
  `,
)

function errorPage(message: string): string {
  return pageShell(
    'שגיאה — החממה',
    `
      <div class="icon">⚠️</div>
      <h1>לא הצלחנו לקבל את הסרטון</h1>
      <p class="error-text">${message}</p>
    `,
  )
}

const SUCCESS_PAGE_HTML = pageShell(
  'התקבל — החממה',
  `
    <div class="icon">🌱</div>
    <h1>התקבל בהצלחה!</h1>
    <p class="success-text">הסרטון שלך הועלה. תודה ששלחת!</p>
  `,
)

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
