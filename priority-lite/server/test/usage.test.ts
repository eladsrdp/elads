// בדיקות ספירת קריאות לפריוריטי: זיהוי ישות, צבירה, שיוך לעובד, שמירה ל-DB, ומסלול הקריאה.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app'
import { createSessionToken, SESSION_COOKIE } from '../src/auth/session'
import type { AppContext } from '../src/context'
import { createLocalDb } from '../src/db/local-impl'
import { createODataAdapter } from '../src/priority/odata'
import {
  drainUsage,
  entityFromPath,
  flushUsage,
  israelDay,
  recordPriorityCall,
  withUsageUser,
} from '../src/priority/usage'

afterEach(() => {
  drainUsage() // ניקוי הצבירה הגלובלית בין בדיקות
  vi.unstubAllGlobals()
})

describe('entityFromPath', () => {
  it('ישות שטוחה עם query', () => {
    expect(entityFromPath('ZRDP_DOCUMENTS_p?$select=DOCNO&$top=2000')).toBe('ZRDP_DOCUMENTS_p')
  })
  it('ישות עם מפתח ותת-טופס', () => {
    expect(entityFromPath('CUSTNOTESA(CUSTNOTE=5)/CUSTNOTESTEXT_SUBFORM?$select=TEXT')).toBe(
      'CUSTNOTESA/CUSTNOTESTEXT_SUBFORM',
    )
    expect(entityFromPath("CUSTOMERS('21173')/CUSTDESTS_SUBFORM?$select=CODE")).toBe('CUSTOMERS/CUSTDESTS_SUBFORM')
  })
  it('ישות עם מפתח בלבד', () => {
    expect(entityFromPath('CUSTNOTESA(CUSTNOTE=5)')).toBe('CUSTNOTESA')
  })
})

describe('recordPriorityCall / drainUsage', () => {
  it('מצטבר לפי יום/עובד/ישות/שיטה וסופר שגיאות', () => {
    withUsageUser('elads', () => {
      recordPriorityCall('CUSTNOTESA?$top=5', 'GET', true)
      recordPriorityCall('CUSTNOTESA?$top=9', 'get', true)
      recordPriorityCall('CUSTNOTESA?$top=1', 'GET', false)
      recordPriorityCall('ZRDP_TRANSORDER_q', 'POST', true)
    })
    const rows = drainUsage()
    const notes = rows.find((r) => r.entity === 'CUSTNOTESA' && r.method === 'GET')
    expect(notes).toMatchObject({ empId: 'elads', day: israelDay(), calls: 3, errors: 1 })
    expect(rows.find((r) => r.entity === 'ZRDP_TRANSORDER_q' && r.method === 'POST')).toMatchObject({
      calls: 1,
      errors: 0,
    })
  })

  it('בלי משתמש — נרשם כ-system, ושני עובדים נספרים בנפרד', () => {
    recordPriorityCall('CUSTOMERS', 'GET', true)
    withUsageUser('a', () => recordPriorityCall('CUSTOMERS', 'GET', true))
    withUsageUser('b', () => recordPriorityCall('CUSTOMERS', 'GET', true))
    const emps = drainUsage().map((r) => r.empId).sort()
    expect(emps).toEqual(['a', 'b', 'system'])
  })

  it('drain מאפס', () => {
    recordPriorityCall('CUSTOMERS', 'GET', true)
    expect(drainUsage()).toHaveLength(1)
    expect(drainUsage()).toHaveLength(0)
  })
})

describe('flushUsage', () => {
  it('שומר את הצבירה ומרוקן', async () => {
    recordPriorityCall('CUSTOMERS', 'GET', true)
    const save = vi.fn(async () => {})
    await flushUsage(save)
    expect(save).toHaveBeenCalledOnce()
    expect(drainUsage()).toHaveLength(0)
  })

  it('כשל בשמירה לא זורק', async () => {
    recordPriorityCall('CUSTOMERS', 'GET', true)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(flushUsage(async () => Promise.reject(new Error('db down')))).resolves.toBeUndefined()
  })

  it('timeout לא תוקע את הבקשה', async () => {
    recordPriorityCall('CUSTOMERS', 'GET', true)
    const started = Date.now()
    await flushUsage(() => new Promise<void>(() => {}), 50)
    expect(Date.now() - started).toBeLessThan(1000)
  })

  it('אין מה לשמור — save לא נקרא', async () => {
    const save = vi.fn(async () => {})
    await flushUsage(save)
    expect(save).not.toHaveBeenCalled()
  })
})

describe('createODataAdapter — כל קריאה לפריוריטי נספרת', () => {
  const cfg = { baseUrl: 'https://p.example', tabulaIni: 'x.ini', company: 'co', user: 'u', password: 'p' }

  it('GET מוצלח, כשל 400 ושגיאת רשת נספרים; מונים בלבד, בלי תוכן', async () => {
    const responses = [
      new Response(JSON.stringify({ value: [{ DOCNO: 'PR1', PROJDES: 'x', CUSTNAME: '1', CUSTDES: 'c', STATDES: 'טיוטא' }] }), { status: 200 }),
      new Response('<error>bad</error>', { status: 400 }),
    ]
    vi.stubGlobal('fetch', vi.fn(async () => {
      const next = responses.shift()
      if (!next) throw new Error('network down')
      return next
    }))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const adapter = createODataAdapter(cfg)

    await withUsageUser('elads', async () => {
      await adapter.getTask('PR1')
      await expect(adapter.getTask('PR2')).rejects.toThrow()
      await expect(adapter.getTask('PR3')).rejects.toThrow()
    })

    const [row, ...rest] = drainUsage()
    expect(rest).toHaveLength(0)
    expect(row).toMatchObject({ empId: 'elads', entity: 'ZRDP_DOCUMENTS_p', method: 'GET', calls: 3, errors: 2 })
    expect(JSON.stringify(row)).not.toContain('PR1') // לא נשמרים פרמטרים/מזהים
  })
})

describe('מסלול /api/usage/priority + שמירה בסוף בקשה', () => {
  const ME = { phone: '0501111111', name: 'אלעד', priorityEmpId: 'elads' }

  async function buildApp() {
    const db = createLocalDb('__nonexistent__')
    await db.upsertEmployee({ phone: ME.phone, email: 'a@test.co', priorityEmpId: ME.priorityEmpId, name: ME.name })
    // adapter שמדמה קריאה לפריוריטי בתוך בקשה מאומתת
    const adapter = {
      searchCustNotes: async () => {
        recordPriorityCall('CUSTNOTESA?$top=2000', 'GET', true)
        return []
      },
    }
    const ctx = { db, adapter, email: {}, env: { SESSION_SECRET: 'test-secret', PRIORITY_MODE: 'mock', EMAIL_MODE: 'console' } } as unknown as AppContext
    const token = await createSessionToken(ME, 'test-secret')
    return { app: createApp(ctx), db, headers: { cookie: `${SESSION_COOKIE}=${token}` } }
  }

  it('בלי session — 401', async () => {
    const { app } = await buildApp()
    expect((await app.request('/api/usage/priority')).status).toBe(401)
  })

  it('קריאה לפריוריטי בתוך בקשה נשמרת ל-DB על שם העובד ומוחזרת מהמסלול', async () => {
    const { app, headers } = await buildApp()
    const list = await app.request('/api/custnotes', { headers })
    expect(list.status).toBe(200)

    const res = await app.request('/api/usage/priority?days=7', { headers })
    expect(res.status).toBe(200)
    const rows = (await res.json()) as { empId: string; entity: string; method: string; calls: number }[]
    expect(rows).toContainEqual(expect.objectContaining({ empId: 'elads', entity: 'CUSTNOTESA', method: 'GET', calls: 1 }))
  })

  it('days לא תקין — 400', async () => {
    const { app, headers } = await buildApp()
    expect((await app.request('/api/usage/priority?days=0', { headers })).status).toBe(400)
    expect((await app.request('/api/usage/priority?days=999', { headers })).status).toBe(400)
  })

  it('כשל DB בקריאה — 503 גנרי בלי שם טבלה', async () => {
    const { app, db, headers } = await buildApp()
    vi.spyOn(db, 'listPriorityUsage').mockRejectedValue(new Error('relation "priority_usage" does not exist'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await app.request('/api/usage/priority', { headers })
    expect(res.status).toBe(503)
    expect(await res.text()).not.toContain('priority_usage')
  })
})
