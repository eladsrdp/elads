import { describe, expect, it } from 'vitest'
import { createApp } from './app'
import { env } from './env'
import { createFakeMakeClient } from './make/client'
import { createLocalDb } from './repository/local-impl'
import { createFakeVideoStorage } from './storage/video-storage'

describe('GET /api/health', () => {
  it('מחזיר ok:true', async () => {
    const app = createApp({ db: createLocalDb(), makeClient: createFakeMakeClient(), videoStorage: createFakeVideoStorage(), env })
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
