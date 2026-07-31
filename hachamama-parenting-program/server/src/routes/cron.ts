// Endpoints שמופעלים ע"י scheduler חיצוני (Vercel Cron / curl מ-cron רגיל וכו').
// SECURITY: מוגן ב-CRON_SECRET בדיוק כמו priority-lite/server/src/routes/cron.ts —
// בלי זה כל אחד יכול להריץ שליחת הודעות אמיתיות ל-WhatsApp על חשבוננו.
import { Hono } from 'hono'
import type { AppContext } from '../context'
import { getIsraelDateString } from '../domain/scheduling'
import { runDrip } from '../jobs/drip'
import { generateDailyDeliveries } from '../jobs/generate-daily'
import { sendMorningTriggers } from '../jobs/send-triggers'

function isAuthorized(ctx: AppContext, authHeader: string | undefined): boolean {
  return authHeader === `Bearer ${ctx.env.CRON_SECRET}`
}

export function createCronRoutes(ctx: AppContext) {
  const app = new Hono()

  app.post('/generate-daily', async (c) => {
    if (!isAuthorized(ctx, c.req.header('authorization'))) return c.json({ error: 'לא מורשה' }, 401)
    const result = await generateDailyDeliveries(ctx.db, getIsraelDateString(new Date()))
    return c.json(result)
  })

  app.post('/send-triggers', async (c) => {
    if (!isAuthorized(ctx, c.req.header('authorization'))) return c.json({ error: 'לא מורשה' }, 401)
    const result = await sendMorningTriggers(ctx.db, ctx.makeClient, getIsraelDateString(new Date()))
    return c.json(result)
  })

  app.post('/drip', async (c) => {
    if (!isAuthorized(ctx, c.req.header('authorization'))) return c.json({ error: 'לא מורשה' }, 401)
    const result = await runDrip(ctx.db, ctx.makeClient, new Date().toISOString())
    return c.json(result)
  })

  return app
}
