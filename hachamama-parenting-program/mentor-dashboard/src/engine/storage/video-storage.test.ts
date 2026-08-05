// hachamama-parenting-program/mentor-dashboard/src/engine/storage/video-storage.test.ts
import { describe, expect, it } from 'vitest'
import { createFakeVideoStorage } from './video-storage.js'

describe('createFakeVideoStorage', () => {
  it('רושם קבצים שהועלו ומחזיר URL ציבורי מדומה, בלי HTTP אמיתי', async () => {
    const storage = createFakeVideoStorage()
    const url = await storage.upload(new Uint8Array([1, 2, 3]), 'clip.mp4', 'video/mp4')

    expect(url).toMatch(/^https:\/\/fake-storage\.test\//)
    expect(storage.uploaded).toHaveLength(1)
    expect(storage.uploaded[0].filename).toBe('clip.mp4')
    expect(storage.uploaded[0].contentType).toBe('video/mp4')
  })
})
