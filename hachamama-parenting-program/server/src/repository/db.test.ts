// hachamama-parenting-program/server/src/repository/db.test.ts
import { describe, expect, it } from 'vitest'
import { createDb } from './db'

describe('createDb', () => {
  it('בלי SUPABASE_URL/KEY מחזיר local db תקין', async () => {
    const db = await createDb(undefined, undefined)
    const p = await db.createParticipant({
      fullName: 'בדיקה',
      phone: '+972500000000',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    expect(p.id).toBeTruthy()
  })
})
