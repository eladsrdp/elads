// בדיקות מסלול /api/custnotes — ולידציית מזהה, whitelist ל-handlerEmpId, 404.
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import type { CustNote } from '@priority-lite/shared'
import { createSessionToken, SESSION_COOKIE } from '../src/auth/session'
import type { AppContext } from '../src/context'
import type { AppDB, EmployeeRow } from '../src/db/interface'
import type { PriorityAdapter } from '../src/priority/adapter'
import { createCustNoteRoutes } from '../src/routes/custnotes'

const ME = { phone: '0501111111', name: 'אלעד', priorityEmpId: '42' }

const NOTE: CustNote = {
  id: 5001,
  subject: 'משימת בדיקה',
  custName: 'P-100',
  custDes: 'לקוח בדיקה',
  statDes: 'לפיתוח',
  handlerEmpId: '42',
}

function buildApp(opts: {
  adapter?: Partial<PriorityAdapter>
  employees?: EmployeeRow[]
} = {}) {
  const adapter = {
    searchCustNotes: async () => [NOTE],
    getCustNoteDetail: async (id: number) => (id === NOTE.id ? { ...NOTE } : null),
    updateCustNote: async (_id: number, changes: Record<string, unknown>) => ({ ...NOTE, ...changes }),
    ...opts.adapter,
  } as unknown as PriorityAdapter

  const employees: EmployeeRow[] =
    opts.employees ??
    [{ phone: '0501111111', email: 'a@test.co', priority_emp_id: '42', name: 'אלעד', active: true, totp_secret: null }]

  const db = { listActiveEmployees: async () => employees } as unknown as AppDB
  const ctx = { db, adapter, email: {}, env: { SESSION_SECRET: 'test-secret' } } as unknown as AppContext

  const app = new Hono()
  app.route('/api/custnotes', createCustNoteRoutes(ctx))
  return app
}

async function authHeaders() {
  const token = await createSessionToken(ME, 'test-secret')
  return { cookie: `${SESSION_COOKIE}=${token}` }
}

describe('GET /api/custnotes/:id', () => {
  it('מזהה לא מספרי — 400', async () => {
    const app = buildApp()
    const res = await app.request('/api/custnotes/abc', { headers: await authHeaders() })
    expect(res.status).toBe(400)
  })

  it('משימה שלא נמצאה — 404', async () => {
    const app = buildApp()
    const res = await app.request('/api/custnotes/9999', { headers: await authHeaders() })
    expect(res.status).toBe(404)
  })

  it('נמצאה — 200 עם handlerName שנפתר מ-DB', async () => {
    const app = buildApp()
    const res = await app.request(`/api/custnotes/${NOTE.id}`, { headers: await authHeaders() })
    expect(res.status).toBe(200)
    const body = (await res.json()) as CustNote
    expect(body.handlerName).toBe('אלעד')
  })
})

describe('PATCH /api/custnotes/:id', () => {
  it('מזהה לא מספרי — 400', async () => {
    const app = buildApp()
    const res = await app.request('/api/custnotes/abc', {
      method: 'PATCH',
      headers: { ...(await authHeaders()), 'content-type': 'application/json' },
      body: JSON.stringify({ priority: 10 }),
    })
    expect(res.status).toBe(400)
  })

  it('handlerEmpId שאינו ברשימת עובדי priority-lite — 400', async () => {
    const app = buildApp()
    const res = await app.request(`/api/custnotes/${NOTE.id}`, {
      method: 'PATCH',
      headers: { ...(await authHeaders()), 'content-type': 'application/json' },
      body: JSON.stringify({ handlerEmpId: '999' }),
    })
    expect(res.status).toBe(400)
  })

  it('handlerEmpId תקין — 200', async () => {
    const app = buildApp()
    const res = await app.request(`/api/custnotes/${NOTE.id}`, {
      method: 'PATCH',
      headers: { ...(await authHeaders()), 'content-type': 'application/json' },
      body: JSON.stringify({ handlerEmpId: '42' }),
    })
    expect(res.status).toBe(200)
  })
})
