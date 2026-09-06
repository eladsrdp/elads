// hachamama-parenting-program/mentor-dashboard/src/engine/jobs/drip.test.ts
import { describe, expect, it } from 'vitest'
import { createFakeMakeClient } from '../make/client'
import { createLocalDb } from '../repository/local-impl'
import { buildGoalFollowUpMessage, runDrip } from './drip'

async function setupClickedParticipantWithDueMessage(db: ReturnType<typeof createLocalDb>) {
  const participant = await db.createParticipant({
    fullName: 'ישראל ישראלי',
    phone: '+972501234567',
    signupSourceRef: null,
    signupAt: '2023-01-05T10:00:00.000Z',
    day1Date: '2023-01-08',
  })
  const message = await db.createMessage({
    contentDayNumber: 1,
    sendOffsetTime: '09:00',
    orderInDay: 1,
    bodyText: 'הודעת 9 בבוקר',
    mediaUrl: null,
    mediaType: null,
  })
  const trigger = await db.createDailyTrigger({
    participantId: participant.id,
    calendarDate: '2023-01-08',
    contentDayNumber: 1,
  })
  await db.markDailyTriggerClicked(trigger.id, '2023-01-08T06:00:00.000Z')
  await db.openOrExtendSessionWindow(participant.id, '2023-01-09T06:00:00.000Z')
  const delivery = await db.createMessageDelivery({
    participantId: participant.id,
    messageId: message.id,
    dailyTriggerId: trigger.id,
    scheduledFor: '2023-01-08T09:00:00.000Z',
  })
  return { participant, message, trigger, delivery }
}

describe('runDrip', () => {
  it('שולח הודעה שהגיע זמנה, ה-trigger שלה נלחץ, והחלון פתוח', async () => {
    const db = createLocalDb()
    const { participant, delivery } = await setupClickedParticipantWithDueMessage(db)
    const makeClient = createFakeMakeClient()

    const result = await runDrip(db, makeClient, '2023-01-08T09:01:00.000Z')

    expect(result.sent).toBe(1)
    expect(makeClient.sessionMessagesSent).toEqual([
      { phone: participant.phone, bodyText: 'הודעת 9 בבוקר', mediaUrl: null, mediaType: null },
    ])
    const deliveries = await db.getPendingDeliveriesForTrigger(delivery.daily_trigger_id, '2099-01-01T00:00:00.000Z')
    expect(deliveries).toHaveLength(0) // כבר sent
  })

  it('לא שולח לפני שהגיע הזמן', async () => {
    const db = createLocalDb()
    await setupClickedParticipantWithDueMessage(db)
    const makeClient = createFakeMakeClient()

    const result = await runDrip(db, makeClient, '2023-01-08T08:00:00.000Z') // לפני 09:00

    expect(result.sent).toBe(0)
  })

  it('לא שולח אם החלון נסגר, גם אם ה-trigger נלחץ ואיחר', async () => {
    const db = createLocalDb()
    await setupClickedParticipantWithDueMessage(db)
    const makeClient = createFakeMakeClient()

    const result = await runDrip(db, makeClient, '2023-01-10T00:00:00.000Z') // אחרי expires_at

    expect(result.sent).toBe(0)
  })

  it('שגיאה עבור delivery אחד לא עוצרת שליחה לdeliveries אחרים באותה ריצה', async () => {
    const db = createLocalDb()
    const { delivery: okDelivery } = await setupClickedParticipantWithDueMessage(db)

    const failingParticipant = await db.createParticipant({
      fullName: 'ייכשל',
      phone: '+972500000007',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    const failingMessage = await db.createMessage({
      contentDayNumber: 1,
      sendOffsetTime: '09:00',
      orderInDay: 1,
      bodyText: 'תיכשל',
      mediaUrl: null,
      mediaType: null,
    })
    const failingTrigger = await db.createDailyTrigger({
      participantId: failingParticipant.id,
      calendarDate: '2023-01-08',
      contentDayNumber: 1,
    })
    await db.markDailyTriggerClicked(failingTrigger.id, '2023-01-08T06:00:00.000Z')
    await db.openOrExtendSessionWindow(failingParticipant.id, '2023-01-09T06:00:00.000Z')
    const failingDelivery = await db.createMessageDelivery({
      participantId: failingParticipant.id,
      messageId: failingMessage.id,
      dailyTriggerId: failingTrigger.id,
      scheduledFor: '2023-01-08T09:00:00.000Z',
    })

    const makeClient = createFakeMakeClient()
    const originalSend = makeClient.sendSessionMessage.bind(makeClient)
    makeClient.sendSessionMessage = async (input) => {
      if (input.phone === failingParticipant.phone) throw new Error('כשל מדומה')
      return originalSend(input)
    }

    const result = await runDrip(db, makeClient, '2023-01-08T09:01:00.000Z')

    expect(result.sent).toBe(1)
    expect(result.errors).toEqual([{ deliveryId: failingDelivery.id, error: 'כשל מדומה' }])
    const okDeliveries = await db.getPendingDeliveriesForTrigger(okDelivery.daily_trigger_id, '2099-01-01T00:00:00.000Z')
    expect(okDeliveries).toHaveLength(0) // ok delivery נשלחה
    const failingDeliveries = await db.getPendingDeliveriesForTrigger(failingTrigger.id, '2099-01-01T00:00:00.000Z')
    expect(failingDeliveries).toHaveLength(1) // failing delivery נשארה pending, לא סומנה sent בטעות
  })
})

describe('buildGoalFollowUpMessage', () => {
  it('משבץ את תשובת היעד בתוך הנוסח המאושר', () => {
    const text = buildGoalFollowUpMessage('לדבר יותר בשקט')
    expect(text).toContain('🎯 לדבר יותר בשקט')
    expect(text).toContain('כשיש כיוון ברור')
  })
})

describe('runDrip — goal messages', () => {
  it('לא שולח הודעת יעד לפני שהחלון נפתח (המשתתף עוד לא לחץ)', async () => {
    const db = createLocalDb()
    const participant = await db.createParticipant({
      fullName: 'ישראל',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    await db.createGoalMessage({
      participantId: participant.id,
      questionnaireNumber: 1,
      goalAnswer: 'יעד',
      scheduledFor: '2023-01-08T12:00:00.000Z', // 14:00 בישראל
    })
    const makeClient = createFakeMakeClient()

    // 15:00 — הגיע הזמן, אבל אין חלון-session פתוח (עוד לא לחץ על כפתור הבוקר)
    const result = await runDrip(db, makeClient, '2023-01-08T13:00:00.000Z')

    expect(result.sent).toBe(0)
    expect(makeClient.sessionMessagesSent).toHaveLength(0)
  })

  it('לוחץ באיחור (15:00) — מקבל ברצף גם את הודעת התוכן הרגילה וגם את הודעת היעד, לפי סדר כרונולוגי', async () => {
    const db = createLocalDb()
    const participant = await db.createParticipant({
      fullName: 'ישראל',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    const message = await db.createMessage({
      contentDayNumber: 1,
      sendOffsetTime: '13:45',
      orderInDay: 1,
      bodyText: 'הודעת צהריים',
      mediaUrl: null,
      mediaType: null,
    })
    const trigger = await db.createDailyTrigger({ participantId: participant.id, calendarDate: '2023-01-08', contentDayNumber: 1 })
    await db.createMessageDelivery({
      participantId: participant.id,
      messageId: message.id,
      dailyTriggerId: trigger.id,
      scheduledFor: '2023-01-08T11:45:00.000Z', // 13:45 בישראל — לפני הודעת היעד
    })
    await db.createGoalMessage({
      participantId: participant.id,
      questionnaireNumber: 1,
      goalAnswer: 'לדבר יותר בשקט',
      scheduledFor: '2023-01-08T12:00:00.000Z', // 14:00 בישראל — אחרי הודעת התוכן
    })

    // המשתתף לוחץ רק ב-15:00 (13:00 UTC) — פותח את החלון באיחור
    await db.markDailyTriggerClicked(trigger.id, '2023-01-08T13:00:00.000Z')
    await db.openOrExtendSessionWindow(participant.id, '2023-01-09T13:00:00.000Z')
    const makeClient = createFakeMakeClient()

    const result = await runDrip(db, makeClient, '2023-01-08T13:01:00.000Z')

    expect(result.sent).toBe(2)
    expect(makeClient.sessionMessagesSent.map((m) => m.bodyText)).toEqual([
      'הודעת צהריים', // 13:45 — קודם
      expect.stringContaining('🎯 לדבר יותר בשקט'), // 14:00 — אחרי
    ])
  })

  it('שגיאה בשליחת הודעת יעד לא עוצרת שליחת message_delivery אחר באותה ריצה', async () => {
    const db = createLocalDb()
    const participant = await db.createParticipant({
      fullName: 'ייכשל',
      phone: '+972500000007',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    await db.openOrExtendSessionWindow(participant.id, '2023-01-09T06:00:00.000Z')
    const goalMessage = await db.createGoalMessage({
      participantId: participant.id,
      questionnaireNumber: 1,
      goalAnswer: 'יעד',
      scheduledFor: '2023-01-08T09:00:00.000Z',
    })

    const { delivery: okDelivery } = await setupClickedParticipantWithDueMessage(db)
    const makeClient = createFakeMakeClient()
    const originalSend = makeClient.sendSessionMessage.bind(makeClient)
    makeClient.sendSessionMessage = async (input) => {
      if (input.bodyText.includes('🎯')) throw new Error('כשל מדומה')
      return originalSend(input)
    }

    const result = await runDrip(db, makeClient, '2023-01-08T09:01:00.000Z')

    expect(result.sent).toBe(1)
    expect(result.errors).toEqual([{ deliveryId: goalMessage.id, error: 'כשל מדומה' }])
    const okDeliveries = await db.getPendingDeliveriesForTrigger(okDelivery.daily_trigger_id, '2099-01-01T00:00:00.000Z')
    expect(okDeliveries).toHaveLength(0) // ה-delivery הרגיל נשלח בהצלחה
    expect(await db.getDueGoalMessages('2099-01-01T00:00:00.000Z')).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: goalMessage.id })]),
    ) // הודעת היעד נשארה pending, לא סומנה sent בטעות
  })
})
