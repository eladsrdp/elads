// hachamama-parenting-program/server/src/jobs/generate-daily.test.ts
import { describe, expect, it } from 'vitest'
import { createLocalDb } from '../repository/local-impl'
import { generateDailyDeliveries } from './generate-daily'

async function seedTwoDayProgram(db: ReturnType<typeof createLocalDb>) {
  await db.createContentDay({ dayNumber: 1, title: 'יום 1' })
  await db.createMessage({
    contentDayNumber: 1,
    sendOffsetTime: '06:00',
    orderInDay: 1,
    bodyText: 'בוקר טוב יום 1',
    mediaUrl: null,
    mediaType: null,
  })
  await db.createMessage({
    contentDayNumber: 1,
    sendOffsetTime: '08:00',
    orderInDay: 2,
    bodyText: 'עוד הודעה יום 1',
    mediaUrl: null,
    mediaType: null,
  })
  await db.createContentDay({ dayNumber: 2, title: 'יום 2' })
  await db.createMessage({
    contentDayNumber: 2,
    sendOffsetTime: '07:00',
    orderInDay: 1,
    bodyText: 'בוקר טוב יום 2',
    mediaUrl: null,
    mediaType: null,
  })
}

describe('generateDailyDeliveries', () => {
  it('יוצר daily_trigger אחד + message_delivery לכל הודעה, ליום המתאים לנרשם', async () => {
    const db = createLocalDb()
    await seedTwoDayProgram(db)
    const participant = await db.createParticipant({
      fullName: 'ישראל ישראלי',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })

    const result = await generateDailyDeliveries(db, '2023-01-08') // היום = day1_date שלו = יום 1

    expect(result).toEqual({ triggersCreated: 1, deliveriesCreated: 2, participantsCompleted: 0 })
    const trigger = await db.findDailyTrigger(participant.id, '2023-01-08')
    expect(trigger?.content_day_number).toBe(1)
    const deliveries = await db.getPendingDeliveriesForTrigger(trigger!.id, '2099-01-01T00:00:00.000Z')
    expect(deliveries).toHaveLength(2)
  })

  it('אידמפוטנטי — ריצה כפולה לאותו יום לא יוצרת כפילויות', async () => {
    const db = createLocalDb()
    await seedTwoDayProgram(db)
    await db.createParticipant({
      fullName: 'ישראל ישראלי',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })

    await generateDailyDeliveries(db, '2023-01-08')
    const second = await generateDailyDeliveries(db, '2023-01-08')

    expect(second).toEqual({ triggersCreated: 0, deliveriesCreated: 0, participantsCompleted: 0 })
  })

  it('נרשם שעדיין לא הגיע ה-day1_date שלו לא מקבל כלום', async () => {
    const db = createLocalDb()
    await seedTwoDayProgram(db)
    await db.createParticipant({
      fullName: 'טרם הגיע',
      phone: '+972500000009',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })

    const result = await generateDailyDeliveries(db, '2023-01-07') // יום לפני day1_date

    expect(result).toEqual({ triggersCreated: 0, deliveriesCreated: 0, participantsCompleted: 0 })
  })

  it('נרשם שעבר את אורך התוכנית מסומן completed ולא מקבל עוד הודעות', async () => {
    const db = createLocalDb()
    await seedTwoDayProgram(db) // 2 ימים בסך הכל
    const participant = await db.createParticipant({
      fullName: 'סיים',
      phone: '+972500000008',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })

    const result = await generateDailyDeliveries(db, '2023-01-10') // day1+2 = יום 3, אין יום 3

    expect(result.participantsCompleted).toBe(1)
    const updated = await db.getParticipant(participant.id)
    expect(updated?.status).toBe('completed')
    const active = await db.getActiveParticipants()
    expect(active).toHaveLength(0)
  })
})
