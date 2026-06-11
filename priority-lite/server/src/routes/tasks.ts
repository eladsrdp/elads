// מסלולי משימות: חיפוש, מסך בן (תקציר), יצירה.
import { Hono } from 'hono'
import { type AuthVars, authRequired } from '../auth/middleware'
import type { AppContext } from '../context'
import {
  createTask,
  createTaskSchema,
  getTask,
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

  return app
}
