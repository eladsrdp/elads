// הרכבת אפליקציית ה-Hono — מופרד מ-index.ts כדי שבדיקות יוכלו להרכיב app עם תלויות מדומות.
import { Hono } from 'hono'
import type { AppContext } from './context.js'
import { createCronRoutes } from './routes/cron.js'
import { createVideoSubmissionRoutes } from './routes/video-submission.js'
import { createWebhookRoutes } from './routes/webhooks.js'

export function createApp(ctx: AppContext) {
  const app = new Hono()

  app.get('/api/health', (c) => c.json({ ok: true }))
  app.route('/api/webhooks', createWebhookRoutes(ctx))
  app.route('/api/cron', createCronRoutes(ctx))
  app.route('/', createVideoSubmissionRoutes(ctx))

  app.onError((err, c) => {
    // SECURITY: לא חושפים stack trace/פרטי שגיאה פנימיים ללקוח — רק ללוג השרת.
    console.error('[server error]', err)
    return c.json({ error: 'שגיאת שרת' }, 500)
  })

  return app
}
