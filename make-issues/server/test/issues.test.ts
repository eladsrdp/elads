// בדיקות ל-/api/issues: רשימה לפי סטטוס (עם מיון), ועדכון סטטוס (טופל/להתעלם).
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryDb } from '../src/db/memory-impl'
import { hashPassword } from '../src/auth/password'
import { createAuthRoutes } from '../src/routes/auth'
import { createIssueRoutes } from '../src/routes/issues'
import type { AppContext } from '../src/context'
import { env } from '../src/env'
import type { AppDB } from '../src/db/interface'

let db: AppDB
let ctx: AppContext
let accessCookie: string

function getCookieValue(res: Response, name: string): string | undefined {
  const raw = res.headers.get('set-cookie') ?? ''
  const match = raw.match(new RegExp(`${name}=([^;]+)`))
  return match?.[1]
}

beforeEach(async () => {
  db = createMemoryDb([
    { id: 'u1', username: 'elad', passwordHash: await hashPassword('secret123'), refreshTokenHash: null },
  ])
  ctx = { db, env: { ...env, JWT_SECRET: 'test-jwt-secret' } }

  const authApp = createAuthRoutes(ctx)
  const loginRes = await authApp.request('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'elad', password: 'secret123' }),
  })
  accessCookie = getCookieValue(loginRes, 'mi_access')!
})

async function seedIssue(overrides: Partial<Parameters<AppDB['insertIssue']>[0]> = {}) {
  return db.insertIssue({
    clientName: 'פיק אנד פאק',
    scenarioName: 'סנכרון הזמנות',
    description: 'שגיאה',
    issueType: 'סנריו נפל',
    scenarioLink: 'https://make.com/scenario/1',
    runLink: 'https://make.com/run/1',
    ...overrides,
  })
}

describe('GET /', () => {
  it('401 בלי אימות', async () => {
    const app = createIssueRoutes(ctx)
    const res = await app.request('/?status=open')
    expect(res.status).toBe(401)
  })

  it('מחזיר רק תקלות open כברירת מחדל', async () => {
    await seedIssue()
    const app = createIssueRoutes(ctx)
    const res = await app.request('/', { headers: { Cookie: `mi_access=${accessCookie}` } })
    const body = (await res.json()) as { issues: unknown[] }
    expect(body.issues).toHaveLength(1)
  })

  it('תומך בכמה סטטוסים מופרדים בפסיק', async () => {
    const issue = await seedIssue()
    await db.updateIssueStatus(issue.id, 'handled', 'elad')
    await seedIssue()

    const app = createIssueRoutes(ctx)
    const res = await app.request('/?status=handled,ignored', { headers: { Cookie: `mi_access=${accessCookie}` } })
    const body = (await res.json()) as { issues: { status: string }[] }
    expect(body.issues).toHaveLength(1)
    expect(body.issues[0].status).toBe('handled')
  })

  it('400 עם ערך status לא מוכר', async () => {
    const app = createIssueRoutes(ctx)
    const res = await app.request('/?status=bogus', { headers: { Cookie: `mi_access=${accessCookie}` } })
    expect(res.status).toBe(400)
  })
})

describe('PATCH /:id', () => {
  it('מסמן תקלה כטופלה ורושם resolvedBy מה-access token', async () => {
    const issue = await seedIssue()
    const app = createIssueRoutes(ctx)
    const res = await app.request(`/${issue.id}`, {
      method: 'PATCH',
      headers: { Cookie: `mi_access=${accessCookie}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'handled' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { issue: { status: string; resolvedBy: string } }
    expect(body.issue.status).toBe('handled')
    expect(body.issue.resolvedBy).toBe('elad')
  })

  it('404 על id לא קיים', async () => {
    const app = createIssueRoutes(ctx)
    const res = await app.request('/missing-id', {
      method: 'PATCH',
      headers: { Cookie: `mi_access=${accessCookie}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'handled' }),
    })
    expect(res.status).toBe(404)
  })

  it('400 על סטטוס לא חוקי', async () => {
    const issue = await seedIssue()
    const app = createIssueRoutes(ctx)
    const res = await app.request(`/${issue.id}`, {
      method: 'PATCH',
      headers: { Cookie: `mi_access=${accessCookie}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'open' }),
    })
    expect(res.status).toBe(400)
  })

  it('401 בלי אימות', async () => {
    const issue = await seedIssue()
    const app = createIssueRoutes(ctx)
    const res = await app.request(`/${issue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'handled' }),
    })
    expect(res.status).toBe(401)
  })
})
