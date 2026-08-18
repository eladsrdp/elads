// מסלולי טיוטות חופשיות מקומיות (Phase 2) — לא מסונכרן עם פריוריטי, פרטי למשתמש בלבד.
import { Hono } from 'hono'
import { type AuthVars, authRequired } from '../auth/middleware'
import type { AppContext } from '../context'
import {
  createDraft,
  createDraftSchema,
  deleteDraft,
  listDrafts,
  listDraftsSchema,
  updateDraft,
  updateDraftSchema,
} from '../actions'

export function createDraftRoutes(ctx: AppContext) {
  const app = new Hono<AuthVars>()
  app.use('*', authRequired(ctx.env.SESSION_SECRET))

  app.get('/', async (c) => {
    const parsed = listDraftsSchema.safeParse({ taskId: c.req.query('taskId') })
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    return c.json(await listDrafts(ctx.db, c.get('me'), parsed.data))
  })

  app.post('/', async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = createDraftSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    return c.json(await createDraft(ctx.db, c.get('me'), parsed.data), 201)
  })

  app.patch('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id)) return c.json({ error: 'מזהה לא תקין' }, 400)
    const body = await c.req.json().catch(() => null)
    const parsed = updateDraftSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    const updated = await updateDraft(ctx.db, c.get('me'), id, parsed.data)
    if (!updated) return c.json({ error: 'טיוטה לא נמצאה' }, 404)
    return c.json(updated)
  })

  app.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id)) return c.json({ error: 'מזהה לא תקין' }, 400)
    const ok = await deleteDraft(ctx.db, c.get('me'), id)
    if (!ok) return c.json({ error: 'טיוטה לא נמצאה' }, 404)
    return c.json({ ok: true })
  })

  return app
}
