// Keepalive ל-Supabase: Vercel Cron קורא לזה מדי כמה ימים כדי למנוע auto-pause
// של פרויקטי free-tier (משהים אחרי 7 ימי חוסר-פעילות ב-API).
import { Hono } from 'hono'
import type { AppContext } from '../context'

export function createCronRoutes(ctx: AppContext) {
  const app = new Hono()

  app.get('/keepalive', async (c) => {
    // SECURITY: לא נגיש בלי CRON_SECRET מוגדר — מונע פינג ציבורי לא-מאומת ל-DB.
    // Vercel Cron שולח אוטומטית Authorization: Bearer $CRON_SECRET כשמוגדר env var בשם הזה.
    if (!ctx.env.CRON_SECRET) return c.json({ error: 'CRON_SECRET לא מוגדר' }, 500)
    const auth = c.req.header('authorization')
    if (auth !== `Bearer ${ctx.env.CRON_SECRET}`) return c.json({ error: 'לא מורשה' }, 401)

    await ctx.db.ping()
    return c.json({ ok: true })
  })

  return app
}
