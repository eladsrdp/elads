// hachamama-parenting-program/mentor-dashboard/src/lib/content-view.test.ts
import { describe, expect, it } from 'vitest'
import { groupMessagesByDay, validateMediaFile } from './content-view'
import type { MessageRecord } from './content-data-source'

describe('groupMessagesByDay', () => {
  it('מקבץ הודעות לפי יום, ממוין לפי יום ואז לפי order_in_day', () => {
    const days = [{ day_number: 1, title: null }, { day_number: 2, title: 'שבוע 1' }]
    const messages: MessageRecord[] = [
      { id: 'm2', content_day_number: 2, send_offset_time: '06:45', order_in_day: 0, body_text: 'יום 2', media_url: null, media_type: null },
      { id: 'm1b', content_day_number: 1, send_offset_time: '06:50', order_in_day: 1, body_text: 'שני', media_url: null, media_type: null },
      { id: 'm1a', content_day_number: 1, send_offset_time: '06:45', order_in_day: 0, body_text: 'ראשון', media_url: null, media_type: null },
    ]

    const groups = groupMessagesByDay(days, messages)

    expect(groups.map((g) => g.dayNumber)).toEqual([1, 2])
    expect(groups[0].title).toBeNull()
    expect(groups[1].title).toBe('שבוע 1')
    expect(groups[0].messages.map((m) => m.id)).toEqual(['m1a', 'm1b'])
  })

  it('יום בלי הודעות מופיע עדיין בקבוצה, עם רשימה ריקה', () => {
    const days = [{ day_number: 1, title: null }]
    const groups = groupMessagesByDay(days, [])
    expect(groups).toEqual([{ dayNumber: 1, title: null, messages: [] }])
  })
})

describe('validateMediaFile', () => {
  it('מקבל תמונה בגודל תקין ומחזיר את media_type הנכון', () => {
    const result = validateMediaFile({ name: 'a.png', size: 1024, type: 'image/png' })
    expect(result).toEqual({ ok: true, mediaType: 'image' })
  })

  it('דוחה קובץ גדול מהמקסימום', () => {
    const result = validateMediaFile({ name: 'a.png', size: 50 * 1024 * 1024, type: 'image/png' })
    expect(result.ok).toBe(false)
  })

  it('דוחה סוג קובץ לא נתמך', () => {
    const result = validateMediaFile({ name: 'a.exe', size: 1024, type: 'application/x-msdownload' })
    expect(result.ok).toBe(false)
  })

  it('מזהה document (pdf/docx) בנוסף לתמונה/וידאו/אודיו', () => {
    expect(validateMediaFile({ name: 'a.pdf', size: 1024, type: 'application/pdf' })).toEqual({ ok: true, mediaType: 'document' })
    expect(validateMediaFile({ name: 'a.mp4', size: 1024, type: 'video/mp4' })).toEqual({ ok: true, mediaType: 'video' })
    expect(validateMediaFile({ name: 'a.mp3', size: 1024, type: 'audio/mpeg' })).toEqual({ ok: true, mediaType: 'audio' })
  })
})
