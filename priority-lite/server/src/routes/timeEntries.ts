// מסלולי דיווחי שעות: סנכרון טיוטות וקריאת דיווחים קיימים.
import { Hono } from 'hono'
import { z } from 'zod'
import type { SyncItemResult } from '@priority-lite/shared'
import { type AuthVars, authRequired } from '../auth/middleware'
import type { AppContext } from '../context'
import {
  getTimeEntries,
  getTimeEntriesSchema,
  reportTime,
  reportTimeSchema,
} from '../actions'

const syncBodySchema = z.object({ entries: z.array(reportTimeSchema).min(1).max(100) })

export function createTimeEntryRoutes(ctx: AppContext) {
  const app = new Hono<AuthVars>()
  app.use('*', authRequired(ctx.env.SESSION_SECRET))

  app.post('/sync', async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = syncBodySchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)

    // סדרתי בכוונה — פריוריטי מגביל בקשות מקבילות
    const results: SyncItemResult[] = []
    for (const entry of parsed.data.entries) {
      results.push(await reportTime(ctx.adapter, c.get('me'), entry))
    }
    return c.json({ results })
  })

  app.get('/', async (c) => {
    const parsed = getTimeEntriesSchema.safeParse({
      from: c.req.query('from'),
      to: c.req.query('to'),
    })
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    return c.json(await getTimeEntries(ctx.adapter, c.get('me'), parsed.data))
  })

  return app
}
