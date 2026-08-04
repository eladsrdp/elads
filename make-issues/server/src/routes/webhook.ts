// POST /api/webhook/issues — מקבל התראות כשל סנריו מ-Make.com.
import { Hono } from 'hono'
import { z } from 'zod'
import { ISSUE_TYPES } from '@make-issues/shared'
import type { AppContext } from '../context'
import { requireWebhookSecret } from '../auth/webhookAuth'

const webhookSchema = z.object({
  clientName: z.string().min(1).max(200),
  scenarioName: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  issueType: z.enum(ISSUE_TYPES),
  scenarioLink: z.string().url(),
  runLink: z.string().url(),
})

export function createWebhookRoutes(ctx: AppContext) {
  const app = new Hono()
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
