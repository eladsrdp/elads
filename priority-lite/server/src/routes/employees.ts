// רשימת עובדי priority-lite — לבורר "לטיפול" בניהול משימות.
import { Hono } from 'hono'
import { type AuthVars, authRequired } from '../auth/middleware'
import type { AppContext } from '../context'
import { listEmployees } from '../actions'

export function createEmployeeRoutes(ctx: AppContext) {
  const app = new Hono<AuthVars>()
  app.use('*', authRequired(ctx.env.SESSION_SECRET))

  app.get('/', async (c) => {
    return c.json(await listEmployees(ctx.db, c.get('me')))
  })

  return app
}
