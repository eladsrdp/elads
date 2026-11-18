// ספירת שימוש ב-API של פריוריטי — קריאה בלבד. הנתונים נצברים ב-usage.ts ונשמרים בסוף כל בקשת API (app.ts).
import { Hono } from 'hono'
import { z } from 'zod'
import { type AuthVars, authRequired } from '../auth/middleware'
import type { AppContext } from '../context'
import { israelDay } from '../priority/usage'

const querySchema = z.object({ days: z.coerce.number().int().min(1).max(60).default(14) })

export function createUsageRoutes(ctx: AppContext) {
  const app = new Hono<AuthVars>()
  app.use('*', authRequired(ctx.env.SESSION_SECRET))

  /** שורות שימוש ל-N הימים האחרונים (כולל היום). */
  app.get('/priority', async (c) => {
    const parsed = querySchema.safeParse({ days: c.req.query('days') })
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    const since = israelDay(new Date(Date.now() - (parsed.data.days - 1) * 24 * 60 * 60 * 1000))
    try {
      return c.json(await ctx.db.listPriorityUsage(since))
    } catch (err) {
      // SECURITY: לא חושפים שמות טבלאות/שגיאת DB ל-UI — רק לוג שרת.
      console.error('[usage] listPriorityUsage failed:', err instanceof Error ? err.message : err)
      return c.json({ error: 'ספירת השימוש עדיין לא הופעלה בשרת' }, 503)
    }
  })

  return app
}
