// hachamama-parenting-program/server/src/repository/local-impl.test.ts
import { describe, expect, it } from 'vitest'
import { createLocalDb } from './local-impl'

describe('createLocalDb — participants', () => {
  it('יוצר נרשם ומחזיר אותו עם id ו-status active', async () => {
    const db = createLocalDb()
    const p = await db.createParticipant({
      fullName: 'ישראל ישראלי',
      phone: '+972501234567',
      signupSourceRef: 'ext-123',
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    expect(p.id).toBeTruthy()
    expect(p.status).toBe('active')
    expect(p.full_name).toBe('ישראל ישראלי')
  })

  it('getParticipant מחזיר undefined כשלא קיים', async () => {
    const db = createLocalDb()
    expect(await db.getParticipant('missing')).toBeUndefined()
  })

  it('findParticipantByPhone מוצא לפי טלפון', async () => {
    const db = createLocalDb()
    const created = await db.createParticipant({
      fullName: 'שרה כהן',
      phone: '+972521111111',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    const found = await db.findParticipantByPhone('+972521111111')
    expect(found?.id).toBe(created.id)
  })

  it('getActiveParticipants מחזיר רק active, לא completed', async () => {
    const db = createLocalDb()
    const a = await db.createParticipant({
      fullName: 'א',
      phone: '+972500000001',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    await db.createParticipant({
      fullName: 'ב',
      phone: '+972500000002',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    await db.markParticipantCompleted(a.id)

    const active = await db.getActiveParticipants()
    expect(active).toHaveLength(1)
    expect(active[0].full_name).toBe('ב')
  })
})
