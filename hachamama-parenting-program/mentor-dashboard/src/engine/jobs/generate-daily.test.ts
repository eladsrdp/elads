// hachamama-parenting-program/mentor-dashboard/src/engine/jobs/generate-daily.test.ts
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

    const result = await generateDailyDeliveries(db, '2023-01-08', 60) // היום = day1_date שלו = יום 1

    expect(result).toEqual({ triggersCreated: 1, deliveriesCreated: 2, participantsCompleted: 0, errors: [] })
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

    await generateDailyDeliveries(db, '2023-01-08', 60)
    const second = await generateDailyDeliveries(db, '2023-01-08', 60)

    expect(second).toEqual({ triggersCreated: 0, deliveriesCreated: 0, participantsCompleted: 0, errors: [] })
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

    const result = await generateDailyDeliveries(db, '2023-01-07', 60) // יום לפני day1_date

    expect(result).toEqual({ triggersCreated: 0, deliveriesCreated: 0, participantsCompleted: 0, errors: [] })
  })

  it('שגיאה עבור נרשם אחד לא עוצרת את הריצה עבור נרשמים אחרים', async () => {
    const db = createLocalDb()
    await seedTwoDayProgram(db)
    const failing = await db.createParticipant({
      fullName: 'ייכשל',
      phone: '+972500000007',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    const ok = await db.createParticipant({
      fullName: 'יצליח',
      phone: '+972500000006',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })

    const originalCreateDailyTrigger = db.createDailyTrigger.bind(db)
    db.createDailyTrigger = async (input) => {
      if (input.participantId === failing.id) throw new Error('כשל מדומה')
      return originalCreateDailyTrigger(input)
    }

    const result = await generateDailyDeliveries(db, '2023-01-08', 60)

    expect(result.errors).toEqual([{ participantId: failing.id, error: 'כשל מדומה' }])
    expect(result.triggersCreated).toBe(1) // רק "יצליח" הצליח
    expect(await db.findDailyTrigger(ok.id, '2023-01-08')).toBeTruthy()
    expect(await db.findDailyTrigger(failing.id, '2023-01-08')).toBeUndefined()
  })

  it('נרשם שעבר את programLengthDays מסומן completed ולא מקבל עוד הודעות', async () => {
    const db = createLocalDb()
    await seedTwoDayProgram(db)
    const participant = await db.createParticipant({
      fullName: 'סיים',
      phone: '+972500000008',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })

    const result = await generateDailyDeliveries(db, '2023-01-10', 2) // day1+2 = יום 3 > programLengthDays=2

    expect(result.participantsCompleted).toBe(1)
    const updated = await db.getParticipant(participant.id)
    expect(updated?.status).toBe('completed')
    const active = await db.getActiveParticipants()
    expect(active).toHaveLength(0)
  })

  it('נרשם שהגיע ליום שאין בו עדיין תוכן מאושר, אבל programLengthDays עדיין לא עבר — נשאר active', async () => {
    // בדיקת רגרסיה לבאג קריטי שנמצא בסקירה הסופית: completion חושב בעבר לפי
    // getMaxContentDayNumber() (כמה content_days קיימים ב-DB כרגע) במקום לפי
    // programLengthDays קבוע — מה שסימן בטעות את כל הקבוצה הפעילה כ-completed
    // בפריסה טרייה, לפני שהתוכן אושר במלואו דרך Plan B.
    const db = createLocalDb()
    await seedTwoDayProgram(db) // תוכן אושר רק לימים 1-2
    const participant = await db.createParticipant({
      fullName: 'ממתין לתוכן',
      phone: '+972500000005',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })

    // יום 5 בתוכנית (day1 + 4 ימים) — הרבה לפני programLengthDays=60, אבל אין
    // עדיין content_day מאושר עבורו.
    const result = await generateDailyDeliveries(db, '2023-01-12', 60)

    expect(result).toEqual({ triggersCreated: 0, deliveriesCreated: 0, participantsCompleted: 0, errors: [] })
    const updated = await db.getParticipant(participant.id)
    expect(updated?.status).toBe('active') // לא completed בטעות
    expect(await db.findDailyTrigger(participant.id, '2023-01-12')).toBeUndefined()
  })
})
