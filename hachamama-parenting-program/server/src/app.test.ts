import { describe, expect, it } from 'vitest'
import { createApp } from './app'

describe('GET /api/health', () => {
  it('מחזיר ok:true בלי תלויות אמיתיות', async () => {
    // @ts-expect-error — ל-health check אין צורך בתלויות אמיתיות בשלב הזה
    const app = createApp({})
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
