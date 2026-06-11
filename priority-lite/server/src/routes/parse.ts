// פענוח טקסט חופשי לדיווח שעות — שולח ל-Gemini ומחזיר JSON מובנה.
import { Hono } from 'hono'
import { type AuthVars, authRequired } from '../auth/middleware'
import type { AppContext } from '../context'

const GEMINI_MODEL = 'gemini-2.5-flash'

export function createParseRoutes(ctx: AppContext) {
  const app = new Hono<AuthVars>()
  app.use('*', authRequired(ctx.env.SESSION_SECRET))

  app.post('/', async (c) => {
    const body = await c.req.json().catch(() => null)
    const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 500) : ''
    if (!text) return c.json({ error: 'חסר שדה text' }, 400)

    if (!ctx.env.GEMINI_API_KEY) {
      return c.json({ error: 'GEMINI_API_KEY לא מוגדר בשרת' }, 503)
    }

    // רשימת כל הפרויקטים הפעילים כהקשר ל-AI (best effort).
    // חשוב לשלוח את כולם — אחרת המודל לא יוכל להתאים פרויקט שלא ברשימה.
    let taskContext = 'לא זמין'
    try {
      const tasks = await ctx.adapter.searchTasks('', 1000)
      taskContext = tasks.map((t) => `${t.id}: ${t.name} (${t.projectName})`).join('\n')
    } catch { /* best effort */ }

    const today = new Date().toISOString().slice(0, 10)
    const prompt = `אתה מנתח דיווחי שעות בעברית. פענח את הטקסט לדיווח אחד או יותר.

תאריך היום: ${today}

פרויקטים זמינים (מספר: שם (לקוח)):
${taskContext}

קלט המשתמש: "${text}"

החזר JSON בלבד לפי הסכמה — מערך "entries" עם דיווח אחד או יותר:
{
  "entries": [
    {
      "taskId": "מחרוזת או null — ה-ID של הפרויקט מהרשימה (PRxxxxxxxx) אם זוהה",
      "taskName": "מחרוזת או null — שם הפרויקט (החלק לפני הסוגריים ברשימה). אם זיהית taskId — חובה למלא גם את taskName",
      "projectName": "מחרוזת או null — שם הלקוח (החלק בתוך הסוגריים ברשימה)",
      "date": "YYYY-MM-DD או null — ברירת מחדל היום אם לא צויין",
      "durationMin": מספר שלם דקות או null,
      "note": "מחרוזת או null — על מה עבדו",
      "ordName": "מחרוזת או null — מספר הזמנה אם צויין",
      "ordLine": מספר שלם או null,
      "billable": true/false/null
    }
  ]
}

כללים:
- אם הטקסט מתאר כמה דיווחים נפרדים (משימות/פרויקטים שונים, או זמנים שונים) — החזר אובייקט נפרד לכל אחד ב-entries. לדוגמה: "שעתיים על פרויקט א' ושעה על פרויקט ב'" → שני אובייקטים.
- אם יש דיווח אחד בלבד — entries יכיל אובייקט אחד.
- "שעתיים"=120, "שעה"=60, "שעה וחצי"=90, "45 דקות"=45, "רבע שעה"=15, "שלושת רבעי שעה"=45
- "היום"=היום, "אתמול"=אתמול, "שלשום"=שלשום
- התאם פרויקט לפי ID מדויק או שם (גם חלקי/מקורב)
- אם אי אפשר לקבוע שדה — null`

    let res: Response
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(20_000),
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': ctx.env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 1024,
              responseMimeType: 'application/json',
              // משימת חילוץ פשוטה — מכבים "thinking" כדי לא לבזבז טוקנים ולהאיץ
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        },
      )
    } catch {
      return c.json({ error: 'שגיאת תקשורת מול Gemini — נסה שוב' }, 502)
    }

    if (!res.ok) {
      // לא חושפים את גוף השגיאה החיצוני למשתמש — רק קוד סטטוס
      console.error('[gemini] HTTP', res.status)
      return c.json({ error: 'שירות הפענוח החזיר שגיאה — נסה שוב' }, 502)
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!raw) {
      console.error('[gemini] empty response:', JSON.stringify(data).slice(0, 500))
      return c.json({ error: 'תשובה ריקה מהמודל' }, 500)
    }

    try {
      const parsed = JSON.parse(raw)
      // מנרמלים לפורמט אחיד { entries: [...] } — גם אם המודל החזיר מערך גולמי או אובייקט בודד
      let entries: unknown[]
      if (Array.isArray(parsed)) entries = parsed
      else if (Array.isArray(parsed?.entries)) entries = parsed.entries
      else entries = [parsed]
      if (entries.length === 0) return c.json({ error: 'לא זוהה אף דיווח' }, 422)
      return c.json({ entries })
    } catch {
      console.error('[gemini] unparseable:', raw.slice(0, 300))
      return c.json({ error: 'לא ניתן לפענח את הטקסט' }, 422)
    }
  })

  return app
}
