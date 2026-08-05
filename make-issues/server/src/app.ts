// הרכבת אפליקציית ה-Hono — מופרד מ-index.ts כדי שבדיקות/Vercel entry יוכלו להרכיב app בעצמם.
import { Hono } from 'hono'
import type { AppContext } from './context'
import { createAuthRoutes } from './routes/auth'
import { createIssueRoutes } from './routes/issues'
import { createWebhookRoutes } from './routes/webhook'

export function createApp(ctx: AppContext) {
  const app = new Hono()

  app.get('/api/health', (c) => c.json({ ok: true }))
  app.route('/api/auth', createAuthRoutes(ctx))
  app.route('/api/issues', createIssueRoutes(ctx))
  app.route('/api/webhook', createWebhookRoutes(ctx))

  app.onError((err, c) => {
    console.error('[server error]', err)
    return c.json({ error: 'שגיאת שרת' }, 500)
  })

  return app
}
