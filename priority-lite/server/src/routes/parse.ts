// פענוח טקסט חופשי לדיווח שעות — שולח ל-Claude ומחזיר JSON מובנה.
import Anthropic from '@anthropic-ai/sdk'
import { Hono } from 'hono'
import { type AuthVars, authRequired } from '../auth/middleware'
import type { AppContext } from '../context'

export function createParseRoutes(ctx: AppContext) {
  const app = new Hono<AuthVars>()
  app.use('*', authRequired(ctx.env.SESSION_SECRET))

  app.post('/', async (c) => {
    const body = await c.req.json().catch(() => null)
    const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 500) : ''
    if (!text) return c.json({ error: 'חסר שדה text' }, 400)

    if (!ctx.env.ANTHROPIC_API_KEY) {
      return c.json({ error: 'ANTHROPIC_API_KEY לא מוגדר בשרת' }, 503)
    }

    // Fetch task list for context (best effort)
    let taskContext = 'לא זמין'
    try {
      const tasks = await ctx.adapter.searchTasks('', 100)
      taskContext = tasks
        .slice(0, 60)
        .map((t) => `${t.id}: ${t.name} (${t.projectName})`)
        .join('\n')
    } catch { /* best effort */ }

    const client = new Anthropic({ apiKey: ctx.env.ANTHROPIC_API_KEY })
    const today = new Date().toISOString().slice(0, 10)

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `אתה מנתח דיווחי שעות בעברית. פענח את הטקסט הבא לרשומה מובנית.

תאריך היום: ${today}

פרויקטים זמינים (מספר: שם (לקוח)):
${taskContext}

קלט המשתמש: "${text}"

החזר JSON בלבד (ללא markdown), לפי הסכמה:
{
  "taskId": "מחרוזת או null — מזהה פרויקט מהרשימה אם זוהה",
  "taskName": "מחרוזת או null",
  "projectName": "מחרוזת או null",
  "date": "YYYY-MM-DD או null — ברירת מחדל היום אם לא צויין",
  "durationMin": מספר שלם דקות או null,
  "note": "מחרוזת או null — על מה עבדו",
  "ordName": "מחרוזת או null — מספר הזמנה אם צויין",
  "ordLine": מספר שלם או null,
  "billable": true/false/null
}

כללים:
- "שעתיים"=120, "שעה"=60, "שעה וחצי"=90, "45 דקות"=45, "רבע שעה"=15, "שלוש רבע"=45
- "היום"=היום, "אתמול"=אתמול, "שלשום"=שלשום
- התאם פרויקט לפי ID מדויק או שם (גם חלקי/מקורב)
- אם אי אפשר לקבוע שדה — null`,
        },
      ],
    })

    const content = msg.content[0]
    if (content.type !== 'text') return c.json({ error: 'תשובה לא צפויה מהמודל' }, 500)

    try {
      const parsed = JSON.parse(content.text)
      return c.json(parsed)
    } catch {
      return c.json({ error: 'לא ניתן לפענח את הטקסט', raw: content.text }, 422)
    }
  })

  return app
}
