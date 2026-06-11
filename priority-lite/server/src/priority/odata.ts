// Adapter אמיתי מול Priority REST API (OData v4).
// מבנה הנתונים מופה מתוך $metadata ודיווחים אמיתיים — ראו mapping.ts.
import type { TaskSummary } from '@priority-lite/shared'
import type { NewTimeEntry, PriorityAdapter } from './adapter'
import { assertMappingComplete, priorityMapping as m } from './mapping'

export interface ODataConfig {
  baseUrl: string
  tabulaIni: string
  company: string
  user: string
  password: string
}

/** סמפור פשוט — פריוריטי מגביל בקשות מקבילות, אז מקסימום 2 בו-זמנית. */
function createLimiter(max: number) {
  let active = 0
  const queue: (() => void)[] = []
  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= max) await new Promise<void>((r) => queue.push(r))
    active++
    try {
      return await fn()
    } finally {
      active--
      queue.shift()?.()
    }
  }
}

function escapeOData(value: string): string {
  return value.replace(/'/g, "''")
}

/**
 * מחלץ הודעת שגיאה נקייה מתשובת פריוריטי — בלי XML/JSON גולמי.
 * פריוריטי מחזיר שגיאות בכמה פורמטים:
 *   1. שגיאות טופס: { FORM: { InterfaceErrors: { text: "..."|[...] } } }  ← הנפוץ ב-POST
 *   2. OData תקני: { error: { message: "..."|{value} } }
 *   3. XML: <message>…</message>
 * מחזיר רק את טקסט ההודעה (לרוב בעברית), בלי תגיות וקוד ישות פנימי.
 */
function extractErrorMessage(raw: string): string {
  const text = raw.trim()
  try {
    const parsed = JSON.parse(text) as {
      FORM?: { InterfaceErrors?: { text?: unknown } }
      error?: { message?: string | { value?: string } }
    }
    // פורמט שגיאת טופס של פריוריטי — ההודעה ב-FORM.InterfaceErrors.text
    const ieText = parsed.FORM?.InterfaceErrors?.text
    if (typeof ieText === 'string' && ieText.trim()) return ieText.trim()
    if (Array.isArray(ieText)) {
      const msgs = ieText
        .map((x) => (typeof x === 'string' ? x : (x as { text?: string })?.text))
        .filter((s): s is string => !!s && s.trim().length > 0)
      if (msgs.length) return msgs.join('; ')
    }
    // OData תקני
    const msg = parsed.error?.message
    if (typeof msg === 'string' && msg.trim()) return msg.trim()
    if (msg && typeof msg === 'object' && msg.value?.trim()) return msg.value.trim()
  } catch {
    // לא JSON — ננסה XML
  }
  // XML: <message>/<text> ...TEXT...
  for (const match of text.matchAll(/<(?:message|text)[^>]*>([\s\S]*?)<\/(?:message|text)>/gi)) {
    const inner = match[1]?.replace(/<[^>]+>/g, '').trim()
    if (inner) return inner
  }
  // נפילה אחרונה — מסירים תגיות כדי לא להציג XML גולמי
  const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return stripped || 'שגיאה לא ידועה מפריוריטי'
}

type Row = Record<string, unknown>

export function createODataAdapter(cfg: ODataConfig): PriorityAdapter {
  assertMappingComplete()
  const root = `${cfg.baseUrl.replace(/\/$/, '')}/odata/Priority/${cfg.tabulaIni}/${cfg.company}`
  const authHeader = 'Basic ' + Buffer.from(`${cfg.user}:${cfg.password}`).toString('base64')
  const limit = createLimiter(2)

  async function request<T>(path: string, init?: RequestInit, attempt = 0): Promise<T> {
    return limit(async () => {
      const res = await fetch(`${root}/${path}`, {
        ...init,
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...init?.headers,
        },
      })
      // retry עם backoff על throttling או שגיאת שרת זמנית
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt))
        return request<T>(path, init, attempt + 1)
      }
      if (!res.ok) {
        const raw = await res.text()
        // לוג שרת מלא לאבחון (כולל סטטוס) — לא נחשף ל-UI
        console.error(`[priority] ${res.status} ${path}:`, raw.slice(0, 500))
        // ל-UI — רק טקסט ההודעה הנקי, בלי XML/קוד סטטוס/שמות ישויות
        throw new Error(extractErrorMessage(raw).slice(0, 200))
      }
      return (await res.json()) as T
    })
  }

  const f = m.taskFields
  const tf = m.timeFields

  function rowToTask(row: Row): TaskSummary {
    return {
      id: String(row[f.id] ?? ''),
      name: String(row[f.name] ?? ''),
      projectId: String(row[f.projectId] ?? ''),
      projectName: String(row[f.projectName] ?? ''),
      status: row[f.status] != null ? String(row[f.status]) : undefined,
    }
  }

  /**
   * דקות → שעות עשרוניות לפריוריטי, מעוגל כלפי מעלה לרבע שעה.
   * 90 → 1.5 ; 80 (1:20) → 1.5 ; 65 → 1.25. שכבת הגנה אחרונה לפני פריוריטי.
   */
  function toHours(durationMin: number): number {
    const quarterMin = Math.ceil(durationMin / 15) * 15
    return quarterMin / 60
  }

  const taskSelect = [f.id, f.name, f.projectId, f.projectName, f.status].join(',')

  // ה-OData של פריוריטי לא תומך ב-contains() ‏(501), והפרויקטים מעטים (~300) —
  // אז טוענים את כולם, שומרים במטמון קצר, ומסננים אצלנו. חיפוש עברי מיידי.
  let tasksCache: { at: number; items: TaskSummary[] } | null = null
  const TASKS_CACHE_TTL_MS = 5 * 60_000

  async function fetchAllTasks(): Promise<TaskSummary[]> {
    if (tasksCache && Date.now() - tasksCache.at < TASKS_CACHE_TTL_MS) return tasksCache.items
    const data = await request<{ value: Row[] }>(
      `${m.entities.tasks}?$select=${taskSelect}&$top=2000`,
    )
    // מציגים רק פרויקטים פעילים (טיוטא) — לא מבוטלת/סופית, שאי אפשר לדווח עליהם
    const items = data.value
      .map(rowToTask)
      .filter((t) => t.status != null && m.activeStatuses.includes(t.status.trim()))
    tasksCache = { at: Date.now(), items }
    return items
  }

  return {
    async searchTasks(q, limitN = 20) {
      const all = await fetchAllTasks()
      const needle = q.trim()
      const hits = needle
        ? all.filter(
            (t) =>
              t.name.includes(needle) ||
              t.projectName.includes(needle) ||
              t.id.includes(needle),
          )
        : all
      return hits.slice(0, limitN)
    },

    async getTask(id) {
      const data = await request<{ value: Row[] }>(
        `${m.entities.tasks}?$filter=${f.id} eq '${escapeOData(id)}'&$top=1`,
      )
      const row = data.value[0]
      if (!row) return null
      return {
        ...rowToTask(row),
        description: row[f.description] != null ? String(row[f.description]) : undefined,
      }
    },

    async createTask() {
      // יצירת פרויקט חדש דורשת תהליך עסקי (לקוח, סטטוסים) — שלב 2, בתיאום מול המשתמש
      throw new Error('יצירת משימות בפריוריטי עדיין לא נתמכת — בקרוב')
    },

    async createTimeEntry(entry: NewTimeEntry) {
      // POST ל-collection השטוח עם DOCNO בגוף — המבנה שמאומת שעובד מול פריוריטי.
      // שדות חובה: DOCNO (פרויקט), PARTNAME (מק"ט שירות 'ש'ע'), CURDATE, USERLOGIN, TQUANT.
      // CURDATE כתאריך בלבד (YYYY-MM-DD). ה-PDES (הערה) מתקבל יחד ב-POST בודד.
      const body: Row = {
        [tf.employeeId]: entry.priorityEmpId,
        [tf.date]: entry.date,
        [tf.taskId]: entry.taskId,
        [tf.partName]: m.serviceItem,
        [tf.duration]: toHours(entry.durationMin),
      }
      if (entry.note) body[tf.note] = entry.note.slice(0, m.noteMaxLength)
      if (entry.startTime) body[tf.startTime] = entry.startTime
      if (entry.endTime) body[tf.endTime] = entry.endTime
      if (entry.ordName) body[tf.ordName] = entry.ordName
      if (entry.ordLine != null) body[tf.ordLine] = entry.ordLine
      if (entry.billable) body[tf.billable] = 'Y'
      if (entry.dcode) body[tf.dcode] = entry.dcode

      const row = await request<Row>(m.entities.timeEntries, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      return { priorityRef: String(row[tf.ref] ?? '') }
    },

    async listSites(customerId) {
      const cust = escapeOData(customerId)
      const sel = `${m.siteFields.code},${m.siteFields.name}`
      const data = await request<{ value: Row[] }>(
        `${m.entities.customers}('${cust}')/${m.customerSitesSubform}?$select=${sel}`,
      )
      return data.value
        .map((row) => ({
          code: String(row[m.siteFields.code] ?? '').trim(),
          name: String(row[m.siteFields.name] ?? '').trim(),
        }))
        .filter((s) => s.code)
    },

    async getTimeEntries(priorityEmpId, from, to) {
      const filter =
        `${tf.employeeId} eq '${escapeOData(priorityEmpId)}'` +
        ` and ${tf.date} ge ${from}T00:00:00Z and ${tf.date} le ${to}T23:59:59Z`
      const select = [tf.ref, tf.taskId, tf.taskName, tf.date, tf.duration, tf.note].join(',')
      const data = await request<{ value: Row[] }>(
        `${m.entities.timeEntries}?$select=${select}&$filter=${encodeURI(filter)}`,
      )
      return data.value.map((row) => ({
        priorityRef: String(row[tf.ref] ?? ''),
        taskId: String(row[tf.taskId] ?? ''),
        taskName: String(row[tf.taskName] ?? ''),
        date: String(row[tf.date] ?? '').slice(0, 10),
        durationMin: Math.round(Number(row[tf.duration] ?? 0) * 60),
        note: row[tf.note] != null ? String(row[tf.note]) : undefined,
      }))
    },
  }
}
