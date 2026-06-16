// מסלולי משימות: חיפוש, מסך בן (תקציר), יצירה, ומשימות לקוח (CUSTNOTESA).
import { Hono } from 'hono'
import { type AuthVars, authRequired } from '../auth/middleware'
import type { AppContext } from '../context'
import {
  createCustNote,
  createCustNoteSchema,
  createTask,
  createTaskSchema,
  getTask,
  listCustNotes,
  listSites,
  listSitesSchema,
  searchTasks,
  searchTasksSchema,
} from '../actions'

export function createTaskRoutes(ctx: AppContext) {
  const app = new Hono<AuthVars>()
  app.use('*', authRequired(ctx.env.SESSION_SECRET))

  app.get('/', async (c) => {
    const parsed = searchTasksSchema.safeParse({
      q: c.req.query('q'),
      limit: c.req.query('limit'),
    })
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    return c.json(await searchTasks(ctx.adapter, c.get('me'), parsed.data))
  })

  app.get('/:id', async (c) => {
    const detail = await getTask(ctx.adapter, c.get('me'), { id: c.req.param('id') })
    if (!detail) return c.json({ error: 'משימה לא נמצאה' }, 404)
    return c.json(detail)
  })

  // אתרי לקוח (DCODE) לפי מזהה פרויקט — מאתרים את הלקוח (CUSTNAME) ושולפים את אתריו
  app.get('/:id/sites', async (c) => {
    const detail = await getTask(ctx.adapter, c.get('me'), { id: c.req.param('id') })
    if (!detail) return c.json({ error: 'משימה לא נמצאה' }, 404)
    const parsed = listSitesSchema.safeParse({ customerId: detail.projectId })
    if (!parsed.success) return c.json([]) // לפרויקט בלי לקוח — אין אתרים
    return c.json(await listSites(ctx.adapter, c.get('me'), parsed.data))
  })

  app.post('/', async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = createTaskSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    return c.json(await createTask(ctx.adapter, c.get('me'), parsed.data), 201)
  })

  // משימות לקוח (CUSTNOTESA) לפי פרויקט — שולף CUSTNAME מהפרויקט ומחזיר משימות פתוחות
  app.get('/:id/custnotes', async (c) => {
    const detail = await getTask(ctx.adapter, c.get('me'), { id: c.req.param('id') })
    if (!detail) return c.json({ error: 'פרויקט לא נמצא' }, 404)
    if (!detail.projectId) return c.json([])
    return c.json(await listCustNotes(ctx.adapter, c.get('me'), { custName: detail.projectId }))
  })

  // יצירת משימת לקוח חדשה — USERLOGIN לפי המשתמש המחובר
  app.post('/:id/custnotes', async (c) => {
    const detail = await getTask(ctx.adapter, c.get('me'), { id: c.req.param('id') })
    if (!detail) return c.json({ error: 'פרויקט לא נמצא' }, 404)
    const body = await c.req.json().catch(() => null)
    const parsed = createCustNoteSchema.safeParse({
      ...body,
      custName: detail.projectId,
      projDocNo: c.req.param('id'),
    })
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    return c.json(await createCustNote(ctx.adapter, c.get('me'), parsed.data), 201)
  })

  return app
}
