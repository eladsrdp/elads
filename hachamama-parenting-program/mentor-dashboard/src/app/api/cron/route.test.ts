// hachamama-parenting-program/mentor-dashboard/src/app/api/cron/route.test.ts
// בודק את שלושת ה-route handlers ל-cron — auth plumbing בלבד. הלוגיקה של
// generateDailyDeliveries/sendMorningTriggers/runDrip עצמם כבר מכוסה במלואה
// ב-src/engine/jobs/*.test.ts, אז כאן הם מדומים (mocked).
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/engine/app-context', () => ({
  getDb: vi.fn(),
  getMakeClient: vi.fn(),
}))
vi.mock('@/engine/env', () => ({
  engineEnv: { CRON_SECRET: 'test-secret', PROGRAM_LENGTH_DAYS: 448 },
}))
vi.mock('@/engine/jobs/generate-daily', () => ({
  generateDailyDeliveries: vi.fn(),
}))
vi.mock('@/engine/jobs/send-triggers', () => ({
  sendMorningTriggers: vi.fn(),
}))
vi.mock('@/engine/jobs/drip', () => ({
  runDrip: vi.fn(),
}))

import { getDb } from '@/engine/app-context'
import { generateDailyDeliveries } from '@/engine/jobs/generate-daily'
import { sendMorningTriggers } from '@/engine/jobs/send-triggers'
import { runDrip } from '@/engine/jobs/drip'
import { GET as generateDailyGet, POST as generateDailyPost } from './generate-daily/route'
import { GET as sendTriggersGet, POST as sendTriggersPost } from './send-triggers/route'
import { GET as dripGet, POST as dripPost } from './drip/route'

function makeRequest(path: string, method: string, authHeader?: string): Request {
  return new Request(`http://localhost/api/cron/${path}`, {
    method,
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

describe('cron route handlers', () => {
  beforeEach(() => {
    vi.mocked(getDb).mockResolvedValue({} as never)
    vi.mocked(generateDailyDeliveries).mockResolvedValue({
      triggersCreated: 0,
      deliveriesCreated: 0,
      participantsCompleted: 0,
      errors: [],
    })
    vi.mocked(sendMorningTriggers).mockResolvedValue({ sent: 0, errors: [] })
    vi.mocked(runDrip).mockResolvedValue({ sent: 0, errors: [] })
  })

  it.each([
    ['generate-daily', generateDailyGet, generateDailyPost],
    ['send-triggers', sendTriggersGet, sendTriggersPost],
    ['drip', dripGet, dripPost],
  ] as const)('%s דוחה בלי CRON_SECRET תקין, ב-GET וב-POST', async (path, get, post) => {
    expect((await get(makeRequest(path, 'GET', 'Bearer wrong'))).status).toBe(401)
    expect((await post(makeRequest(path, 'POST'))).status).toBe(401)
  })

  it('GET /generate-daily עובד — כך ש-Vercel Cron (שקורא רק ב-GET) יכול להפעיל את זה', async () => {
    const res = await generateDailyGet(makeRequest('generate-daily', 'GET', 'Bearer test-secret'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      triggersCreated: 0,
      deliveriesCreated: 0,
      participantsCompleted: 0,
      errors: [],
    })
  })

  it('POST /send-triggers מריץ ומחזיר תוצאה', async () => {
    const res = await sendTriggersPost(makeRequest('send-triggers', 'POST', 'Bearer test-secret'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sent: 0, errors: [] })
  })

  it('POST /drip מריץ ומחזיר תוצאה', async () => {
    const res = await dripPost(makeRequest('drip', 'POST', 'Bearer test-secret'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sent: 0, errors: [] })
  })
})
