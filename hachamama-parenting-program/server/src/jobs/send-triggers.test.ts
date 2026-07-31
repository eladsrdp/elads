// hachamama-parenting-program/server/src/jobs/send-triggers.test.ts
import { describe, expect, it } from 'vitest'
import { createFakeMakeClient } from '../make/client'
import { createLocalDb } from '../repository/local-impl'
import { sendMorningTriggers } from './send-triggers'

describe('sendMorningTriggers', () => {
  it('שולח טריגר לכל daily_trigger שעדיין לא נשלח, עם יום-בשבוע ו-button_payload נכונים', async () => {
    const db = createLocalDb()
    const participant = await db.createParticipant({
      fullName: 'ישראל ישראלי',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    const trigger = await db.createDailyTrigger({
      participantId: participant.id,
      calendarDate: '2023-01-10', // יום שלישי
      contentDayNumber: 3,
    })
    const makeClient = createFakeMakeClient()

    const result = await sendMorningTriggers(db, makeClient, '2023-01-10')

    expect(result.sent).toBe(1)
    expect(makeClient.morningTriggersSent).toEqual([
      { phone: '+972501234567', dayOfWeekName: 'שלישי', buttonPayload: trigger.id },
    ])
    const updated = await db.getDailyTrigger(trigger.id)
    expect(updated?.trigger_sent_at).toBeTruthy()
  })

  it('לא שולח שוב טריגר שכבר נשלח', async () => {
    const db = createLocalDb()
    const participant = await db.createParticipant({
      fullName: 'ישראל',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    const trigger = await db.createDailyTrigger({
      participantId: participant.id,
      calendarDate: '2023-01-10',
      contentDayNumber: 3,
    })
    await db.markDailyTriggerSent(trigger.id, '2023-01-10T05:00:00.000Z')
    const makeClient = createFakeMakeClient()

    const result = await sendMorningTriggers(db, makeClient, '2023-01-10')

    expect(result.sent).toBe(0)
    expect(makeClient.morningTriggersSent).toHaveLength(0)
  })
})
