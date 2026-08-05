// בדיקות ל-POST /issues של ה-webhook: אימות secret, ולידציית payload, הכנסה ל-DB.
import { describe, expect, it } from 'vitest'
import { createMemoryDb } from '../src/db/memory-impl'
import { createWebhookRoutes } from '../src/routes/webhook'
import type { AppContext } from '../src/context'
import { env } from '../src/env'

function makeCtx(): AppContext {
  return { db: createMemoryDb(), env: { ...env, WEBHOOK_SECRET: 'the-secret' } }
}

const validBody = {
  clientName: 'פיק אנד פאק',
  scenarioName: 'סנכרון הזמנות',
  description: 'שגיאת חיבור ל-API',
  issueType: 'סנריו נפל',
  scenarioLink: 'https://www.make.com/en/scenario/1',
  runLink: 'https://www.make.com/en/scenario/1/run/2',
}

describe('POST /issues', () => {
  it('201-שקול (ok:true) עם secret ו-payload תקינים, ונכתב ל-DB', async () => {
    const ctx = makeCtx()
    const app = createWebhookRoutes(ctx)
    const res = await app.request('/issues', {
      method: 'POST',
      headers: { Authorization: 'Bearer the-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; id: string }
    expect(body.ok).toBe(true)
    expect(await ctx.db.listIssues(['open'])).toHaveLength(1)
  })

  it('401 בלי header Authorization', async () => {
    const ctx = makeCtx()
    const app = createWebhookRoutes(ctx)
    const res = await app.request('/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    })
    expect(res.status).toBe(401)
  })

  it('401 עם secret שגוי', async () => {
    const ctx = makeCtx()
    const app = createWebhookRoutes(ctx)
    const res = await app.request('/issues', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    })
    expect(res.status).toBe(401)
  })

  it('400 כש-issueType מחוץ לרשימה הקבועה', async () => {
    const ctx = makeCtx()
    const app = createWebhookRoutes(ctx)
    const res = await app.request('/issues', {
      method: 'POST',
      headers: { Authorization: 'Bearer the-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, issueType: 'משהו אחר' }),
    })
    expect(res.status).toBe(400)
    expect(await ctx.db.listIssues(['open'])).toHaveLength(0)
  })

  it('400 כש-scenarioLink אינו URL תקין', async () => {
    const ctx = makeCtx()
    const app = createWebhookRoutes(ctx)
    const res = await app.request('/issues', {
      method: 'POST',
      headers: { Authorization: 'Bearer the-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, scenarioLink: 'not-a-url' }),
    })
    expect(res.status).toBe(400)
  })

  it('400 כשחסר שדה חובה', async () => {
    const ctx = makeCtx()
    const app = createWebhookRoutes(ctx)
    const { clientName: _clientName, ...missingClientName } = validBody
    const res = await app.request('/issues', {
      method: 'POST',
      headers: { Authorization: 'Bearer the-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify(missingClientName),
    })
    expect(res.status).toBe(400)
  })

  it('400 כש-scenarioLink אינו https (וקטור XSS מאוחסן דרך javascript:)', async () => {
    const ctx = makeCtx()
    const app = createWebhookRoutes(ctx)
    const res = await app.request('/issues', {
      method: 'POST',
      headers: { Authorization: 'Bearer the-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, scenarioLink: 'javascript:alert(1)' }),
    })
    expect(res.status).toBe(400)
  })

  it('400 כש-scenarioLink הוא http רגיל (לא https)', async () => {
    const ctx = makeCtx()
    const app = createWebhookRoutes(ctx)
    const res = await app.request('/issues', {
      method: 'POST',
      headers: { Authorization: 'Bearer the-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, scenarioLink: 'http://example.com' }),
    })
    expect(res.status).toBe(400)
  })

  it('400 כש-description חורג מ-max(2000) — גבול שדה, גוף בקשה קטן מהמגבלה הכללית', async () => {
    const ctx = makeCtx()
    const app = createWebhookRoutes(ctx)
    const res = await app.request('/issues', {
      method: 'POST',
      headers: { Authorization: 'Bearer the-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, description: 'א'.repeat(2001) }),
    })
    expect(res.status).toBe(400)
  })

  it('413 כשגוף הבקשה חורג מ-16KB (גם עם secret תקין)', async () => {
    const ctx = makeCtx()
    const app = createWebhookRoutes(ctx)
    const res = await app.request('/issues', {
      method: 'POST',
      headers: { Authorization: 'Bearer the-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, description: 'x'.repeat(20 * 1024) }),
    })
    expect(res.status).toBe(413)
  })
})
