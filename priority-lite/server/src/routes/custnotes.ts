// מסלולי ניהול משימות גלובליים — חיפוש, פרטי משימה, עדכון.
// (נפרד מ-/api/tasks/:id/custnotes הקיים, שמשמש ליצירה בהקשר פרויקט ספציפי.)
import { Hono } from 'hono'
import { type AuthVars, authRequired } from '../auth/middleware'
import type { AppContext } from '../context'
import {
  getCustNoteDetail,
  searchCustNotes,
  searchCustNotesSchema,
  updateCustNote,
  updateCustNoteSchema,
} from '../actions'

export function createCustNoteRoutes(ctx: AppContext) {
  const app = new Hono<AuthVars>()
  app.use('*', authRequired(ctx.env.SESSION_SECRET))

  app.get('/', async (c) => {
    const parsed = searchCustNotesSchema.safeParse({
      q: c.req.query('q'),
      mine: c.req.query('mine') === 'true',
      status: c.req.queries('status'),
      limit: c.req.query('limit'),
    })
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)
    return c.json(await searchCustNotes(ctx.adapter, c.get('me'), parsed.data))
  })

  app.get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id)) return c.json({ error: 'מזהה לא תקין' }, 400)
    const detail = await getCustNoteDetail(ctx.adapter, c.get('me'), id)
    if (!detail) return c.json({ error: 'משימה לא נמצאה' }, 404)
    // המתאמים (mock/odata) מחזירים רק handlerEmpId (login) — השם מגיע מה-DB שלנו,
    // לא מפריוריטי, אז הפתרון (resolve) קורה כאן ולא בשכבת ה-adapter.
    if (detail.handlerEmpId) {
      const employees = await ctx.db.listActiveEmployees()
      const handler = employees.find((e) => e.priority_emp_id === detail.handlerEmpId)
      if (handler) detail.handlerName = handler.name
    }
    return c.json(detail)
  })

  app.patch('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    if (!Number.isInteger(id)) return c.json({ error: 'מזהה לא תקין' }, 400)
    const body = await c.req.json().catch(() => null)
    const parsed = updateCustNoteSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'בקשה לא תקינה' }, 400)

    // "לטיפול" מוגבל לעובדי priority-lite בלבד — לא סומכים על הקליינט
    if (parsed.data.handlerEmpId) {
      const employees = await ctx.db.listActiveEmployees()
      if (!employees.some((e) => e.priority_emp_id === parsed.data.handlerEmpId)) {
        return c.json({ error: 'איש הצוות שנבחר אינו ברשימת המשתמשים' }, 400)
      }
    }

    try {
      const updated = await updateCustNote(ctx.adapter, c.get('me'), id, parsed.data)
      return c.json(updated)
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'שגיאה בעדכון המשימה' }, 500)
    }
  })

  return app
}
