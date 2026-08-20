// מסלולי צ'קליסט אישי מקומי (Phase 2) — לא מסונכרן עם פריוריטי, פרטי למשתמש בלבד.
import { Hono } from 'hono'
import { type AuthVars, authRequired } from '../auth/middleware'
import type { AppContext } from '../context'
import {
  createChecklistItem,
  createChecklistItemSchema,
  deleteChecklistItem,
  listChecklistItems,
  listChecklistItemsSchema,
  reorderChecklistItems,
  reorderChecklistSchema,
  updateChecklistItem,
  updateChecklistItemSchema,
} from '../actions'

export function createChecklistRoutes(ctx: AppContext) {
  const app = new Hono<AuthVars>()
  app.use('*', authRequired(ctx.env.SESSION_SECRET))

  app.get('/', async (c) => {
    const parsed = listChecklistItemsSchema.safeParse({ taskId: c.req.query('taskId') })
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    return c.json(await listChecklistItems(ctx.db, c.get('me'), parsed.data))
  })

  app.post('/', async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = createChecklistItemSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    return c.json(await createChecklistItem(ctx.db, c.get('me'), parsed.data), 201)
  })

  // רשום לפני /:id בכוונה — כדי ש-"reorder" לא ינותח בטעות כמזהה
  app.patch('/reorder', async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = reorderChecklistSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    const ok = await reorderChecklistItems(ctx.db, c.get('me'), parsed.data)
    if (!ok) return c.json({ error: 'סדר לא תקין — אחד הפריטים לא שייך לרשימה הזו' }, 400)
    return c.json({ ok: true })
  })

  app.patch('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id)) return c.json({ error: 'מזהה לא תקין' }, 400)
    const body = await c.req.json().catch(() => null)
    const parsed = updateChecklistItemSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    const updated = await updateChecklistItem(ctx.db, c.get('me'), id, parsed.data)
    if (!updated) return c.json({ error: 'פריט לא נמצא' }, 404)
    return c.json(updated)
  })

  app.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id)) return c.json({ error: 'מזהה לא תקין' }, 400)
    const ok = await deleteChecklistItem(ctx.db, c.get('me'), id)
    if (!ok) return c.json({ error: 'פריט לא נמצא' }, 404)
    return c.json({ ok: true })
  })

  return app
}
