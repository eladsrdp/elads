// Adapter אמיתי מול Priority REST API (OData v4).
// מבנה הנתונים מופה מתוך $metadata ודיווחים אמיתיים — ראו mapping.ts.
import type { CustNote, TaskSummary, UpdateCustNoteInput } from '@priority-lite/shared'
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

  function rowToCustNote(row: Row): CustNote {
    const cf = m.custNoteFields
    return {
      id: Number(row[cf.id] ?? 0),
      subject: String(row[cf.subject] ?? ''),
      custName: String(row[cf.custName] ?? ''),
      custDes: String(row[cf.custDes] ?? ''),
      statDes: row[cf.statDes] != null ? String(row[cf.statDes]) : undefined,
      tillDate: row[cf.tillDate] != null ? String(row[cf.tillDate]).slice(0, 10) : undefined,
      projDocNo: row[cf.projDocNo] != null ? String(row[cf.projDocNo]).trim() || undefined : undefined,
      hoursReported: row[cf.hours] != null ? Number(row[cf.hours]) : undefined,
      priority: row[cf.priority] != null ? Number(row[cf.priority]) : undefined,
      handlerEmpId: row[cf.handler] != null ? String(row[cf.handler]) : undefined,
    }
  }

  async function fetchCustNoteDetail(id: number): Promise<CustNote | null> {
    const cf = m.custNoteFields
    const select = [cf.id, cf.subject, cf.custName, cf.custDes, cf.statDes, cf.tillDate, cf.projDocNo, cf.hours, cf.priority, cf.owner, cf.handler].join(',')
    // SECURITY/יציבות: `?.` על value — פריוריטי נצפתה חי מחזירה מדי-פעם תשובת 200 בלי
    // מבנה {value:[...]} התקין (חוסר יציבות זמנית בשירות), מה שהיה קורס באינדקס [0] ישיר.
    const data = await request<{ value?: Row[] }>(
      `${m.entities.custNotes}?$select=${select}&$filter=${cf.id} eq ${id}&$top=1`,
    )
    const row = data.value?.[0]
    if (!row) return null
    const base = rowToCustNote(row)
    base.ownerName = row[cf.owner] != null ? String(row[cf.owner]) : undefined

    const textData = await request<{ value: Row[] }>(
      `${m.entities.custNotes}(CUSTNOTE=${id})/${m.custNoteTextSubform}?$select=${m.custNoteTextFields.text}`,
    ).catch(() => ({ value: [] as Row[] }))
    const textRow = textData.value[0]
    base.description = textRow?.[m.custNoteTextFields.text] != null
      ? String(textRow[m.custNoteTextFields.text])
      : undefined

    const logData = await request<{ value: Row[] }>(
      `${m.entities.custNotes}(CUSTNOTE=${id})/${m.custNoteLogSubform}` +
        `?$select=${m.custNoteLogFields.date},${m.custNoteLogFields.status},${m.custNoteLogFields.handler},${m.custNoteLogFields.initiator}` +
        `&$orderby=${m.custNoteLogFields.date} desc`,
    ).catch(() => ({ value: [] as Row[] }))
    base.history = logData.value.map((r) => ({
      date: String(r[m.custNoteLogFields.date] ?? '').slice(0, 10),
      status: String(r[m.custNoteLogFields.status] ?? ''),
      handlerName: r[m.custNoteLogFields.handler] != null ? String(r[m.custNoteLogFields.handler]) : undefined,
      initiatorName: r[m.custNoteLogFields.initiator] != null ? String(r[m.custNoteLogFields.initiator]) : undefined,
    }))

    return base
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
      // SECURITY: CUSTNOTE הוא Int64 — לא שולחים string ולא מאפשרים טקסט חופשי
      if (entry.custnoteId) body[tf.custnote] = entry.custnoteId

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

    async listCustNotes(custName) {
      const cf = m.custNoteFields
      const select = [cf.id, cf.subject, cf.custDes, cf.statDes, cf.tillDate, cf.projDocNo, cf.hours].join(',')
      const filter = `${cf.closed} eq 'N' and ${cf.custName} eq '${escapeOData(custName)}'`
      const data = await request<{ value: Row[] }>(
        `${m.entities.custNotes}?$select=${select}&$filter=${encodeURI(filter)}&$orderby=${cf.id} desc&$top=100`,
      )
      return data.value.map((row): CustNote => ({
        id: Number(row[cf.id] ?? 0),
        subject: String(row[cf.subject] ?? ''),
        custName,
        custDes: String(row[cf.custDes] ?? ''),
        statDes: row[cf.statDes] != null ? String(row[cf.statDes]) : undefined,
        tillDate: row[cf.tillDate] != null ? String(row[cf.tillDate]).slice(0, 10) : undefined,
        projDocNo: row[cf.projDocNo] != null ? String(row[cf.projDocNo]).trim() || undefined : undefined,
        hoursReported: row[cf.hours] != null ? Number(row[cf.hours]) : undefined,
      }))
    },

    async createCustNote(input) {
      const cf = m.custNoteFields
      const body: Row = {
        [cf.subject]: input.subject.slice(0, 52),
        [cf.custName]: input.custName,
        [cf.userLogin]: input.userLogin,
      }
      if (input.tillDate) body[cf.tillDate] = input.tillDate
      if (input.projDocNo) body[cf.projDocNo] = input.projDocNo
      const row = await request<Row>(m.entities.custNotes, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      return {
        id: Number(row[cf.id] ?? 0),
        subject: String(row[cf.subject] ?? input.subject),
        custName: input.custName,
        custDes: String(row[cf.custDes] ?? ''),
        statDes: row[cf.statDes] != null ? String(row[cf.statDes]) : undefined,
        projDocNo: input.projDocNo,
      }
    },

    async searchCustNotes(query, opts, limitN = 50) {
      const cf = m.custNoteFields
      const select = [cf.id, cf.subject, cf.custName, cf.custDes, cf.statDes, cf.tillDate, cf.projDocNo, cf.hours, cf.priority, cf.handler].join(',')
      const filters = [`${cf.closed} eq 'N'`]
      if (opts.handlerEmpId) filters.push(`${cf.handler} eq '${escapeOData(opts.handlerEmpId)}'`)
      if (opts.status && opts.status.length > 0) {
        filters.push('(' + opts.status.map((s) => `${cf.statDes} eq '${escapeOData(s)}'`).join(' or ') + ')')
      }
      // OData לא תומך ב-contains() — טוענים עד 500 עם הפילטרים המבניים, ומסננים טקסט חופשי אצלנו
      // (אותו דפוס כמו fetchAllTasks למעלה).
      const data = await request<{ value: Row[] }>(
        `${m.entities.custNotes}?$select=${select}&$filter=${encodeURI(filters.join(' and '))}&$orderby=${cf.id} desc&$top=500`,
      )
      const needle = query.trim()
      const rows = needle
        ? data.value.filter(
            (row) => String(row[cf.subject] ?? '').includes(needle) || String(row[cf.custDes] ?? '').includes(needle),
          )
        : data.value
      return rows.slice(0, limitN).map(rowToCustNote)
    },

    async getCustNoteDetail(id) {
      return fetchCustNoteDetail(id)
    },

    async updateCustNote(id, changes: UpdateCustNoteInput) {
      const cf = m.custNoteFields
      const body: Row = {}
      if (changes.status) body[cf.statDes] = changes.status
      if (changes.priority != null) body[cf.priority] = changes.priority
      if (changes.tillDate) body[cf.tillDate] = changes.tillDate
      if (changes.handlerEmpId) body[cf.handler] = changes.handlerEmpId

      if (Object.keys(body).length > 0) {
        await request<Row>(`${m.entities.custNotes}(CUSTNOTE=${id})`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      }

      if (changes.description) {
        // WARNING: לא אומת חי אם ה-POST הזה מוסיף רשומה חדשה או דורס את התיאור הקיים
        // (ראה Task 1 בתוכנית המימוש — פריוריטי הפכה ללא-יציבה באמצע האימות). אם מתברר
        // שזו דריסה, זה עלול למחוק תיאורים קודמים בשקט — יש לאמת לפני חשיפה רחבה למשתמשים.
        await request<Row>(`${m.entities.custNotes}(CUSTNOTE=${id})/${m.custNoteTextSubform}`, {
          method: 'POST',
          body: JSON.stringify({ [m.custNoteTextFields.text]: changes.description }),
        })
      }

      const updated = await fetchCustNoteDetail(id)
      if (!updated) throw new Error('משימה לא נמצאה לאחר עדכון')
      return updated
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
