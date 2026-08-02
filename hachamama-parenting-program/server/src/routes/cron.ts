// Endpoints שמופעלים ע"י scheduler חיצוני (Vercel Cron / curl מ-cron רגיל וכו').
// SECURITY: מוגן ב-CRON_SECRET בדיוק כמו priority-lite/server/src/routes/cron.ts —
// בלי זה כל אחד יכול להריץ שליחת הודעות אמיתיות ל-WhatsApp על חשבוננו.
//
// הערה (code review): שלושת ה-endpoints חולקים סוד אחד, גם ש-send-triggers/drip
// גורמים לשליחה אמיתית ב-WhatsApp ו-generate-daily רק כותב ל-DB שלנו (בלאסט-רדיוס
// שונה). התקבלה בכוונה — מי שמפעיל את שלושתם הוא אותו scheduler מהימן, ומי שיש לו
// גישה ל-env הזה כבר יכול לגרום נזק שווה או גדול יותר דרך SUPABASE_SERVICE_KEY/
// MAKE_WEBHOOK_URL ישירות. פיצול לסודות נפרדים לפי סיכון הוא שיפור אפשרי, לא חסימה.
import { Hono } from 'hono'
import type { AppContext } from '../context.js'
import { getIsraelDateString } from '../domain/scheduling.js'
import { runDrip } from '../jobs/drip.js'
import { generateDailyDeliveries } from '../jobs/generate-daily.js'
import { sendMorningTriggers } from '../jobs/send-triggers.js'

function isAuthorized(ctx: AppContext, authHeader: string | undefined): boolean {
  return authHeader === `Bearer ${ctx.env.CRON_SECRET}`
}

export function createCronRoutes(ctx: AppContext) {
  const app = new Hono()

  // GET+POST: Vercel's native Cron feature always calls via GET (and auto-attaches
  // Authorization: Bearer $CRON_SECRET using the project's own env var of that name —
  // no extra config needed there). POST stays supported for external services
  // (cron-job.org) and manual curl testing.
  app.on(['GET', 'POST'], '/generate-daily', async (c) => {
    if (!isAuthorized(ctx, c.req.header('authorization'))) return c.json({ error: 'לא מורשה' }, 401)
    const result = await generateDailyDeliveries(ctx.db, getIsraelDateString(new Date()), ctx.env.PROGRAM_LENGTH_DAYS)
    return c.json(result)
  })

  app.on(['GET', 'POST'], '/send-triggers', async (c) => {
    if (!isAuthorized(ctx, c.req.header('authorization'))) return c.json({ error: 'לא מורשה' }, 401)
    const result = await sendMorningTriggers(ctx.db, ctx.makeClient, getIsraelDateString(new Date()))
    return c.json(result)
  })

  app.on(['GET', 'POST'], '/drip', async (c) => {
    if (!isAuthorized(ctx, c.req.header('authorization'))) return c.json({ error: 'לא מורשה' }, 401)
    const result = await runDrip(ctx.db, ctx.makeClient, new Date().toISOString())
    return c.json(result)
  })

  return app
}
