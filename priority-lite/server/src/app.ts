// הרכבת אפליקציית ה-Hono — מופרד מ-index.ts כדי שבדיקות יוכלו להרכיב app עם תלויות מדומות.
import { Hono } from 'hono'
import type { AppContext } from './context'
import { createAuthRoutes } from './routes/auth'
import { createParseRoutes } from './routes/parse'
import { createTaskRoutes } from './routes/tasks'
import { createTimeEntryRoutes } from './routes/timeEntries'

export function createApp(ctx: AppContext) {
  const app = new Hono()

  app.get('/api/health', (c) =>
    c.json({
      ok: true,
      priorityMode: ctx.env.PRIORITY_MODE,
      emailMode: ctx.env.EMAIL_MODE,
      aiEnabled: !!ctx.env.GEMINI_API_KEY,
    }),
  )
  app.route('/api/auth', createAuthRoutes(ctx))
  app.route('/api/tasks', createTaskRoutes(ctx))
  app.route('/api/time-entries', createTimeEntryRoutes(ctx))
  app.route('/api/parse-entry', createParseRoutes(ctx))

  app.onError((err, c) => {
    console.error('[server error]', err)
    return c.json({ error: err instanceof Error ? err.message : 'שגיאת שרת' }, 500)
  })

  return app
}
