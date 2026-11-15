// hachamama-parenting-program/mentor-dashboard/src/engine/jobs/send-triggers.test.ts
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

    const result = await sendMorningTriggers(db, makeClient, new Date('2023-01-10T10:00:00Z'))

    expect(result.sent).toBe(1)
    expect(makeClient.morningTriggersSent).toEqual([
      { phone: '+972501234567', fullName: 'ישראל ישראלי', dayOfWeekName: 'יום שלישי', weekNumber: 1, buttonPayload: trigger.id },
    ])
    const updated = await db.getDailyTrigger(trigger.id)
    expect(updated?.trigger_sent_at).toBeTruthy()
  })

  it('ביום שבת נותן "מוצ"ש", לא "יום שבת" — תואם למינוח בתוכן', async () => {
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
      calendarDate: '2023-01-07', // יום שבת
      contentDayNumber: 7,
    })
    const makeClient = createFakeMakeClient()

    await sendMorningTriggers(db, makeClient, new Date('2023-01-07T10:00:00Z'))

    expect(makeClient.morningTriggersSent).toEqual([
      { phone: '+972501234567', fullName: 'ישראל', dayOfWeekName: 'מוצ"ש', weekNumber: 1, buttonPayload: trigger.id },
    ])
  })

  it('שולח weekNumber מחושב מ-content_day_number של הטריגר (יום 10 → שבוע 2)', async () => {
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
      calendarDate: '2023-01-17',
      contentDayNumber: 10,
    })
    const makeClient = createFakeMakeClient()

    await sendMorningTriggers(db, makeClient, new Date('2023-01-17T10:00:00Z'))

    expect(makeClient.morningTriggersSent[0]).toMatchObject({ buttonPayload: trigger.id, weekNumber: 2 })
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

    const result = await sendMorningTriggers(db, makeClient, new Date('2023-01-10T10:00:00Z'))

    expect(result.sent).toBe(0)
    expect(makeClient.morningTriggersSent).toHaveLength(0)
  })

  it('שגיאה עבור trigger אחד לא עוצרת שליחה לטריגרים אחרים באותה ריצה', async () => {
    const db = createLocalDb()
    const failingParticipant = await db.createParticipant({
      fullName: 'ייכשל',
      phone: '+972500000007',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    const okParticipant = await db.createParticipant({
      fullName: 'יצליח',
      phone: '+972500000006',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    const failingTrigger = await db.createDailyTrigger({
      participantId: failingParticipant.id,
      calendarDate: '2023-01-10',
      contentDayNumber: 3,
    })
    const okTrigger = await db.createDailyTrigger({
      participantId: okParticipant.id,
      calendarDate: '2023-01-10',
      contentDayNumber: 3,
    })
    const makeClient = createFakeMakeClient()
    const originalSend = makeClient.sendMorningTrigger.bind(makeClient)
    makeClient.sendMorningTrigger = async (input) => {
      if (input.phone === failingParticipant.phone) throw new Error('כשל מדומה')
      return originalSend(input)
    }

    const result = await sendMorningTriggers(db, makeClient, new Date('2023-01-10T10:00:00Z'))

    expect(result.sent).toBe(1)
    expect(result.errors).toEqual([{ dailyTriggerId: failingTrigger.id, error: 'כשל מדומה' }])
    expect((await db.getDailyTrigger(okTrigger.id))?.trigger_sent_at).toBeTruthy()
    expect((await db.getDailyTrigger(failingTrigger.id))?.trigger_sent_at).toBeFalsy()
  })
})

describe('sendMorningTriggers — שליחה ב-06:45 מקומי לכל נרשמת', () => {
  async function setup(timezone?: string) {
    const db = createLocalDb()
    const participant = await db.createParticipant({
      fullName: 'שרה',
      phone: '+13475550100',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
      timezone,
    })
    const trigger = await db.createDailyTrigger({
      participantId: participant.id,
      calendarDate: '2023-01-08',
      contentDayNumber: 1,
    })
    return { db, trigger, makeClient: createFakeMakeClient() }
  }

  it('ניו יורק: לפני 06:45 מקומי (11:44Z) לא נשלח; ב-06:45 מקומי (11:45Z) נשלח', async () => {
    const { db, trigger, makeClient } = await setup('America/New_York')

    const early = await sendMorningTriggers(db, makeClient, new Date('2023-01-08T11:44:00Z'))
    expect(early.sent).toBe(0)

    const onTime = await sendMorningTriggers(db, makeClient, new Date('2023-01-08T11:45:00Z'))
    expect(onTime.sent).toBe(1)
    expect((await db.getDailyTrigger(trigger.id))?.trigger_sent_at).toBeTruthy()
  })

  it('ישראל (ברירת מחדל): לפני 06:45 (04:44Z) לא נשלח; ב-06:45 (04:45Z) נשלח — כמו היום', async () => {
    const { db, makeClient } = await setup()

    expect((await sendMorningTriggers(db, makeClient, new Date('2023-01-08T04:44:00Z'))).sent).toBe(0)
    expect((await sendMorningTriggers(db, makeClient, new Date('2023-01-08T04:45:00Z'))).sent).toBe(1)
  })

  it('לא שולח trigger של תאריך מקומי אחר: בישראל כבר 09.1 בעוד שה-trigger הוא של 08.1', async () => {
    const { db, makeClient } = await setup() // ישראלית, trigger של 08.1
    // 2023-01-08T23:00Z = 01:00 בישראל ב-09.1
    expect((await sendMorningTriggers(db, makeClient, new Date('2023-01-08T23:00:00Z'))).sent).toBe(0)
  })

  it('לא שולח פעמיים (trigger_sent_at כבר מסומן)', async () => {
    const { db, makeClient } = await setup('America/New_York')
    await sendMorningTriggers(db, makeClient, new Date('2023-01-08T12:00:00Z'))
    const again = await sendMorningTriggers(db, makeClient, new Date('2023-01-08T12:15:00Z'))
    expect(again.sent).toBe(0)
    expect(makeClient.morningTriggersSent).toHaveLength(1)
  })
})
