// hachamama-parenting-program/mentor-dashboard/src/lib/content-clone.test.ts
import { describe, expect, it } from 'vitest'
import { copyVersionMedia } from './content-clone'
import type { MediaType, MessageRecord } from './content-data-source'

function message(id: string, mediaUrl: string | null, mediaType: MediaType | null = 'image', day = 1): MessageRecord {
  return {
    id,
    content_day_number: day,
    send_offset_time: '07:00',
    order_in_day: 0,
    body_text: 'x',
    media_url: mediaUrl,
    media_type: mediaType,
  }
}

function setup(messages: MessageRecord[]) {
  const updates: Array<{ id: string; url: string | null; type: MediaType | null }> = []
  let uploads = 0
  const dataSource = {
    listMessagesForVersion: async () => messages,
    uploadMedia: async () => {
      uploads++
      return { url: `https://storage/new-${uploads}.png`, path: `p${uploads}` }
    },
    updateMessageMedia: async (id: string, url: string | null, type: MediaType | null) => {
      updates.push({ id, url, type })
    },
  }
  const fetchOk = async () => ({ ok: true, blob: async () => new Blob(['data'], { type: 'image/png' }) })
  return { dataSource, updates, getUploads: () => uploads, fetchOk }
}

describe('copyVersionMedia', () => {
  it('מעתיק כל קובץ ומצביע את ההודעה לעותק החדש, עם אותו media_type', async () => {
    const { dataSource, updates, fetchOk } = setup([message('m1', 'https://storage/old.png', 'image'), message('m2', null, null)])

    const result = await copyVersionMedia(dataSource, 'v2', fetchOk)

    expect(result).toEqual({ copied: 1, failed: 0 })
    expect(updates).toEqual([{ id: 'm1', url: 'https://storage/new-1.png', type: 'image' }])
  })

  it('אותו קובץ בכמה הודעות מועתק פעם אחת, וכל ההודעות מצביעות לאותו עותק חדש', async () => {
    const { dataSource, updates, getUploads, fetchOk } = setup([
      message('m1', 'https://storage/shared.png'),
      message('m2', 'https://storage/shared.png', 'image', 2),
    ])

    const result = await copyVersionMedia(dataSource, 'v2', fetchOk)

    expect(getUploads()).toBe(1)
    expect(result.copied).toBe(1)
    expect(updates.map((u) => u.url)).toEqual(['https://storage/new-1.png', 'https://storage/new-1.png'])
  })

  it('כשל בהורדה לא עוצר את השאר, מדווח כ-failed, וההודעה נשארת על הקובץ המקורי', async () => {
    const { dataSource, updates } = setup([message('m1', 'https://storage/bad.png'), message('m2', 'https://storage/good.png')])
    const fetchMixed = async (url: string) =>
      url.includes('bad')
        ? { ok: false, blob: async () => new Blob([]) }
        : { ok: true, blob: async () => new Blob(['d'], { type: 'image/png' }) }

    const result = await copyVersionMedia(dataSource, 'v2', fetchMixed)

    expect(result).toEqual({ copied: 1, failed: 1 })
    expect(updates.map((u) => u.id)).toEqual(['m2'])
  })

  it('מדווח התקדמות', async () => {
    const { dataSource, fetchOk } = setup([message('m1', 'https://storage/a.png'), message('m2', 'https://storage/b.png')])
    const progress: Array<[number, number]> = []

    await copyVersionMedia(dataSource, 'v2', fetchOk, (done, total) => progress.push([done, total]))

    expect(progress).toEqual([
      [0, 2],
      [1, 2],
      [2, 2],
    ])
  })
})
