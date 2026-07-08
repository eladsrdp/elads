// בדיקות מסלול ה-keepalive — הגנת CRON_SECRET + קריאה ל-db.ping().
import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'
import type { AppContext } from '../src/context'
import type { AppDB } from '../src/db/interface'
import { createCronRoutes } from '../src/routes/cron'

function buildApp(ping: () => Promise<void>, cronSecret?: string) {
  const db = { ping } as unknown as AppDB
  const ctx = { db, adapter: {}, email: {}, env: { CRON_SECRET: cronSecret } } as unknown as AppContext
  const app = new Hono()
  app.route('/api/cron', createCronRoutes(ctx))
  return app
}

describe('GET /api/cron/keepalive', () => {
  it('ללא CRON_SECRET מוגדר בשרת — 500, לא נוגע ב-DB', async () => {
    const ping = vi.fn().mockResolvedValue(undefined)
    const app = buildApp(ping, undefined)
    const res = await app.request('/api/cron/keepalive')
    expect(res.status).toBe(500)
    expect(ping).not.toHaveBeenCalled()
  })

  it('בלי Authorization תקין — 401, לא נוגע ב-DB', async () => {
    const ping = vi.fn().mockResolvedValue(undefined)
    const app = buildApp(ping, 'shh-secret')
    const res = await app.request('/api/cron/keepalive', {
      headers: { authorization: 'Bearer wrong' },
    })
    expect(res.status).toBe(401)
    expect(ping).not.toHaveBeenCalled()
  })

  it('עם Bearer תואם — 200 וקורא ל-db.ping()', async () => {
    const ping = vi.fn().mockResolvedValue(undefined)
    const app = buildApp(ping, 'shh-secret')
    const res = await app.request('/api/cron/keepalive', {
      headers: { authorization: 'Bearer shh-secret' },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(ping).toHaveBeenCalledOnce()
  })
})
