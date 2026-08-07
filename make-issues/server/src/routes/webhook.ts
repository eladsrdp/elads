// POST /api/webhook/issues — מקבל התראות כשל סנריו מ-Make.com.
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { z } from 'zod'
import { ISSUE_TYPES } from '@make-issues/shared'
import type { AppContext } from '../context'
import { requireWebhookSecret } from '../auth/webhookAuth'

// SECURITY: מגבילים לסכימת https בלבד — הקישורים מוצגים כ-<a href> קליקבילי
// בדשבורד, וסכימות כמו javascript:/data: הן וקטור XSS מאוחסן נגד המפעיל המחובר.
const httpsUrl = z.string().url().refine((u) => u.startsWith('https://'), { message: 'הקישור חייב להיות https' })

const webhookSchema = z.object({
  clientName: z.string().min(1).max(200),
  scenarioName: z.string().min(1).max(200),
  description: z.string().min(1).max(2000).optional(),
  issueType: z.enum(ISSUE_TYPES),
  scenarioLink: httpsUrl,
  runLink: httpsUrl.optional(),
})

export function createWebhookRoutes(ctx: AppContext) {
  const app = new Hono()
  // SECURITY: הגבלת גודל בקשה לפני בדיקת הסוד — דוחה payload ענק בזול,
  // עוד לפני שמפענחים JSON או בודקים auth.
  app.use('*', bodyLimit({ maxSize: 16 * 1024, onError: (c) => c.json({ error: 'הבקשה גדולה מדי' }, 413) }))
  app.use('*', requireWebhookSecret(ctx.env.WEBHOOK_SECRET))

  app.post('/issues', async (c) => {
    const json = await c.req.json().catch(() => null)
    const body = webhookSchema.safeParse(json)
    if (!body.success) return c.json({ error: 'payload לא תקין' }, 400)

    // לוג מטא-דאטה בלבד — לא כל ה-payload — היגיינת לוגים תקינה גם כשאין PII.
    console.log('[webhook] issue received', {
      clientName: body.data.clientName,
      scenarioName: body.data.scenarioName,
      issueType: body.data.issueType,
    })

    const issue = await ctx.db.insertIssue(body.data)
    return c.json({ ok: true, id: issue.id })
  })

  return app
}
