// inbox/src/db.test.ts
import { describe, expect, it } from 'vitest'
import { createDb } from './db'

describe('createDb', () => {
  it('שומר הודעה חדשה ומחזיר true', () => {
    const db = createDb(':memory:')
    const inserted = db.insertMessage({
      wahaMessageId: 'msg-1',
      direction: 'incoming',
      type: 'text',
      body: 'שלום',
      timestamp: 1700000000,
      rawJson: '{}',
    })
    expect(inserted).toBe(true)
    expect(db.countMessages()).toBe(1)
  })

  it('מתעלם מהודעה כפולה עם אותו waha_message_id ומחזיר false', () => {
    const db = createDb(':memory:')
    db.insertMessage({
      wahaMessageId: 'msg-1',
      direction: 'incoming',
      type: 'text',
      body: 'שלום',
      timestamp: 1700000000,
      rawJson: '{}',
    })
    const secondInsert = db.insertMessage({
      wahaMessageId: 'msg-1',
      direction: 'incoming',
      type: 'text',
      body: 'שלום שוב',
      timestamp: 1700000001,
      rawJson: '{}',
    })
    expect(secondInsert).toBe(false)
    expect(db.countMessages()).toBe(1)
  })

  it('שומר הודעה קולית עם body=NULL', () => {
    const db = createDb(':memory:')
    const inserted = db.insertMessage({
      wahaMessageId: 'msg-2',
      direction: 'incoming',
      type: 'voice',
      body: null,
      timestamp: 1700000000,
      rawJson: '{}',
    })
    expect(inserted).toBe(true)
    expect(db.countMessages()).toBe(1)
  })

  it('שומר הודעות יוצאות ונכנסות גם יחד', () => {
    const db = createDb(':memory:')
    db.insertMessage({
      wahaMessageId: 'msg-in',
      direction: 'incoming',
      type: 'text',
      body: 'נכנס',
      timestamp: 1700000000,
      rawJson: '{}',
    })
    db.insertMessage({
      wahaMessageId: 'msg-out',
      direction: 'outgoing',
      type: 'text',
      body: 'יוצא',
      timestamp: 1700000001,
      rawJson: '{}',
    })
    expect(db.countMessages()).toBe(2)
  })

  it('getMessages מחזיר את כל ההודעות בסדר הכנסה עם מיפוי שדות נכון', () => {
    const db = createDb(':memory:')
    db.insertMessage({
      wahaMessageId: 'msg-in',
      direction: 'incoming',
      type: 'text',
      body: 'נכנס',
      timestamp: 1700000000,
      rawJson: '{}',
    })
    db.insertMessage({
      wahaMessageId: 'msg-voice',
      direction: 'incoming',
      type: 'voice',
      body: null,
      timestamp: 1700000001,
      rawJson: '{}',
    })
    db.insertMessage({
      wahaMessageId: 'msg-out',
      direction: 'outgoing',
      type: 'text',
      body: 'יוצא',
      timestamp: 1700000002,
      rawJson: '{}',
    })

    const messages = db.getMessages()
    expect(messages).toEqual([
      {
        wahaMessageId: 'msg-in',
        direction: 'incoming',
        type: 'text',
        body: 'נכנס',
        timestamp: 1700000000,
      },
      {
        wahaMessageId: 'msg-voice',
        direction: 'incoming',
        type: 'voice',
        body: null,
        timestamp: 1700000001,
      },
      {
        wahaMessageId: 'msg-out',
        direction: 'outgoing',
        type: 'text',
        body: 'יוצא',
        timestamp: 1700000002,
      },
    ])
  })
})
