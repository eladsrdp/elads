// /api/issues — GET (רשימה לפי סטטוס, ממוינת מהחדש), PATCH (סימון טופל/להתעלם).
import { Hono } from 'hono'
import { z } from 'zod'
import { ISSUE_STATUSES, type Issue, type IssueStatus } from '@make-issues/shared'
import type { AppContext } from '../context'
import { requireAuth, type AuthVars } from '../auth/middleware'

function sortNewestFirst(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => (b.resolvedAt ?? b.createdAt).localeCompare(a.resolvedAt ?? a.createdAt))
}

function parseStatuses(param: string): IssueStatus[] | null {
  const candidates = param.split(',').map((s) => s.trim())
  const valid = candidates.filter((s): s is IssueStatus => (ISSUE_STATUSES as readonly string[]).includes(s))
  return valid.length === candidates.length && valid.length > 0 ? valid : null
}

export function createIssueRoutes(ctx: AppContext) {
  const app = new Hono<AuthVars>()
  app.use('*', requireAuth(ctx.env.JWT_SECRET))

  app.get('/', async (c) => {
    const statuses = parseStatuses(c.req.query('status') ?? 'open')
    if (!statuses) return c.json({ error: 'status לא תקין' }, 400)
    const issues = await ctx.db.listIssues(statuses)
    return c.json({ issues: sortNewestFirst(issues) })
  })

  const patchSchema = z.object({ status: z.enum(['handled', 'ignored']) })
  app.patch('/:id', async (c) => {
    const json = await c.req.json().catch(() => null)
    const body = patchSchema.safeParse(json)
    if (!body.success) return c.json({ error: 'סטטוס לא תקין' }, 400)

    const username = c.get('username')
    const updated = await ctx.db.updateIssueStatus(c.req.param('id'), body.data.status, username)
    if (!updated) return c.json({ error: 'תקלה לא נמצאה' }, 404)
    return c.json({ issue: updated })
  })

  return app
}
