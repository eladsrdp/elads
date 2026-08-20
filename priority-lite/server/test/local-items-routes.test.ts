// בדיקות מסלולי /api/checklist ו-/api/drafts — ולידציית מזהה, בידוד לפי משתמש, 404.
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { createSessionToken, SESSION_COOKIE } from '../src/auth/session'
import type { AppContext } from '../src/context'
import { createLocalDb } from '../src/db/local-impl'
import { createChecklistRoutes } from '../src/routes/checklist'
import { createDraftRoutes } from '../src/routes/drafts'

const ME = { phone: '0501111111', name: 'אלעד', priorityEmpId: '42' }
const OTHER = { phone: '0502222222', name: 'רועי', priorityEmpId: '99' }

function buildApp() {
  const db = createLocalDb('__nonexistent__')
  const ctx = { db, adapter: {}, email: {}, env: { SESSION_SECRET: 'test-secret' } } as unknown as AppContext
  const app = new Hono()
  app.route('/api/checklist', createChecklistRoutes(ctx))
  app.route('/api/drafts', createDraftRoutes(ctx))
  return app
}

async function authHeaders(me: typeof ME) {
  const token = await createSessionToken(me, 'test-secret')
  return { cookie: `${SESSION_COOKIE}=${token}` }
}

describe('checklist routes', () => {
  it('POST יוצר ו-GET מחזיר', async () => {
    const app = buildApp()
    const createRes = await app.request('/api/checklist', {
      method: 'POST',
      headers: { ...(await authHeaders(ME)), 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'סעיף' }),
    })
    expect(createRes.status).toBe(201)

    const listRes = await app.request('/api/checklist', { headers: await authHeaders(ME) })
    expect(listRes.status).toBe(200)
    expect(await listRes.json()).toHaveLength(1)
  })

  it('משתמש אחר לא רואה את הפריט ברשימה', async () => {
    const app = buildApp()
    await app.request('/api/checklist', {
      method: 'POST',
      headers: { ...(await authHeaders(ME)), 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'סעיף' }),
    })
    const res = await app.request('/api/checklist', { headers: await authHeaders(OTHER) })
    expect(await res.json()).toHaveLength(0)
  })

  it('PATCH על פריט של משתמש אחר — 404', async () => {
    const app = buildApp()
    const createRes = await app.request('/api/checklist', {
      method: 'POST',
      headers: { ...(await authHeaders(ME)), 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'סעיף' }),
    })
    const created = (await createRes.json()) as { id: number }
    const res = await app.request(`/api/checklist/${created.id}`, {
      method: 'PATCH',
      headers: { ...(await authHeaders(OTHER)), 'content-type': 'application/json' },
      body: JSON.stringify({ done: true }),
    })
    expect(res.status).toBe(404)
  })

  it('מזהה לא מספרי — 400', async () => {
    const app = buildApp()
    const res = await app.request('/api/checklist/abc', {
      method: 'PATCH',
      headers: { ...(await authHeaders(ME)), 'content-type': 'application/json' },
      body: JSON.stringify({ done: true }),
    })
    expect(res.status).toBe(400)
  })

  it('PATCH /reorder לא מתנגש עם :id', async () => {
    const app = buildApp()
    const headers = { ...(await authHeaders(ME)), 'content-type': 'application/json' }
    const aRes = await app.request('/api/checklist', { method: 'POST', headers, body: JSON.stringify({ text: 'א' }) })
    const a = (await aRes.json()) as { id: number }
    const bRes = await app.request('/api/checklist', { method: 'POST', headers, body: JSON.stringify({ text: 'ב' }) })
    const b = (await bRes.json()) as { id: number }
    const res = await app.request('/api/checklist/reorder', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ orderedIds: [b.id, a.id] }),
    })
    expect(res.status).toBe(200)
  })
})

describe('draft routes', () => {
  it('POST יוצר ו-GET מחזיר', async () => {
    const app = buildApp()
    const headers = { ...(await authHeaders(ME)), 'content-type': 'application/json' }
    const createRes = await app.request('/api/drafts', { method: 'POST', headers, body: JSON.stringify({ text: 'טיוטה' }) })
    expect(createRes.status).toBe(201)
    const listRes = await app.request('/api/drafts', { headers: await authHeaders(ME) })
    expect(await listRes.json()).toHaveLength(1)
  })

  it('DELETE על טיוטה של משתמש אחר — 404, לא נמחקת בפועל', async () => {
    const app = buildApp()
    const createRes = await app.request('/api/drafts', {
      method: 'POST',
      headers: { ...(await authHeaders(ME)), 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'טיוטה' }),
    })
    const created = (await createRes.json()) as { id: number }
    const delRes = await app.request(`/api/drafts/${created.id}`, { method: 'DELETE', headers: await authHeaders(OTHER) })
    expect(delRes.status).toBe(404)
    const listRes = await app.request('/api/drafts', { headers: await authHeaders(ME) })
    expect(await listRes.json()).toHaveLength(1)
  })
})
