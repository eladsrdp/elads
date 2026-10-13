// hachamama-parenting-program/mentor-dashboard/src/engine/jobs/delivery-sync.test.ts
import { describe, expect, it } from 'vitest'
import { createLocalDb } from '../repository/local-impl'
import { syncDeliveriesForTrigger } from './delivery-sync'

describe('syncDeliveriesForTrigger', () => {
  it('יוצר delivery לכל הודעה שאין לה עדיין אחת, ומדלג על מה שכבר קיים', async () => {
    const db = createLocalDb()
    const participant = await db.createParticipant({
      fullName: 'ישראל',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    await db.createContentDay({ dayNumber: 1, title: null })
    const existingMessage = await db.createMessage({
      contentDayNumber: 1,
      sendOffsetTime: '06:00',
      orderInDay: 1,
      bodyText: 'הודעה ותיקה',
      mediaUrl: null,
      mediaType: null,
    })
    const trigger = await db.createDailyTrigger({
      participantId: participant.id,
      calendarDate: '2023-01-08',
      contentDayNumber: 1,
    })
    await db.createMessageDelivery({
      participantId: participant.id,
      messageId: existingMessage.id,
      dailyTriggerId: trigger.id,
      scheduledFor: '2023-01-08T04:00:00.000Z',
    })

    // הודעה חדשה נוספת ליום הזה *אחרי* שה-trigger וה-delivery הראשון כבר נוצרו —
    // בדיוק התרחיש שגרם לתקלת ה-production (תוכן שנוסף מאוחר).
    const newMessage = await db.createMessage({
      contentDayNumber: 1,
      sendOffsetTime: '13:00',
      orderInDay: 2,
      bodyText: 'הודעה שנוספה מאוחר',
      mediaUrl: null,
      mediaType: null,
    })

    const created = await syncDeliveriesForTrigger(db, trigger)

    expect(created).toBe(1)
    const deliveries = await db.getDeliveriesForTrigger(trigger.id)
    expect(deliveries).toHaveLength(2)
    expect(deliveries.map((d) => d.message_id)).toEqual(
      expect.arrayContaining([existingMessage.id, newMessage.id]),
    )
  })

  it('לא יוצר כלום אם כל ההודעות כבר יש להן delivery', async () => {
    const db = createLocalDb()
    const participant = await db.createParticipant({
      fullName: 'ישראל',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    await db.createContentDay({ dayNumber: 1, title: null })
    const message = await db.createMessage({
      contentDayNumber: 1,
      sendOffsetTime: '06:00',
      orderInDay: 1,
      bodyText: 'הודעה',
      mediaUrl: null,
      mediaType: null,
    })
    const trigger = await db.createDailyTrigger({
      participantId: participant.id,
      calendarDate: '2023-01-08',
      contentDayNumber: 1,
    })
    await db.createMessageDelivery({
      participantId: participant.id,
      messageId: message.id,
      dailyTriggerId: trigger.id,
      scheduledFor: '2023-01-08T04:00:00.000Z',
    })

    const created = await syncDeliveriesForTrigger(db, trigger)

    expect(created).toBe(0)
    expect(await db.getDeliveriesForTrigger(trigger.id)).toHaveLength(1)
  })

  it('מחשב scheduled_for מ-calendar_date של ה-trigger ו-send_offset_time של ההודעה', async () => {
    const db = createLocalDb()
    const participant = await db.createParticipant({
      fullName: 'ישראל',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    await db.createContentDay({ dayNumber: 1, title: null })
    await db.createMessage({
      contentDayNumber: 1,
      sendOffsetTime: '07:00',
      orderInDay: 1,
      bodyText: 'הודעה',
      mediaUrl: null,
      mediaType: null,
    })
    const trigger = await db.createDailyTrigger({
      participantId: participant.id,
      calendarDate: '2023-01-08',
      contentDayNumber: 1,
    })

    await syncDeliveriesForTrigger(db, trigger)

    const [delivery] = await db.getDeliveriesForTrigger(trigger.id)
    expect(delivery.scheduled_for).toBe('2023-01-08T05:00:00.000Z') // 07:00 בישראל בחורף = 05:00 UTC
  })
})

describe('syncDeliveriesForTrigger — הודעת 13:45 רק למי שלחץ לפניה', () => {
  async function setup(clickedAt: string) {
    const db = createLocalDb()
    const participant = await db.createParticipant({
      fullName: 'ישראל',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    await db.createContentDay({ dayNumber: 1, title: null })
    await db.createMessage({ contentDayNumber: 1, sendOffsetTime: '06:45', orderInDay: 0, bodyText: 'בוקר', mediaUrl: null, mediaType: null })
    await db.createMessage({ contentDayNumber: 1, sendOffsetTime: '13:45', orderInDay: 1, bodyText: 'תזכורת', mediaUrl: null, mediaType: null })
    await db.createMessage({ contentDayNumber: 1, sendOffsetTime: '20:00', orderInDay: 2, bodyText: 'ערב', mediaUrl: null, mediaType: null })
    const trigger = await db.createDailyTrigger({ participantId: participant.id, calendarDate: '2023-01-08', contentDayNumber: 1 })
    return { db, trigger: { ...trigger, clicked_at: clickedAt } }
  }

  it('לחץ לפני 13:45 — מקבל את תזכורת הצהריים', async () => {
    const { db, trigger } = await setup('2023-01-08T10:00:00.000Z') // 12:00 בישראל
    await syncDeliveriesForTrigger(db, trigger)
    expect(await db.getDeliveriesForTrigger(trigger.id)).toHaveLength(3)
  })

  it('לחץ אחרי 13:45 — לא מקבל את תזכורת הצהריים, אבל כן את שאר ההודעות', async () => {
    const { db, trigger } = await setup('2023-01-08T12:30:00.000Z') // 14:30 בישראל
    await syncDeliveriesForTrigger(db, trigger)
    const deliveries = await db.getDeliveriesForTrigger(trigger.id)
    expect(deliveries).toHaveLength(2)
    const bodies = await Promise.all(deliveries.map(async (d) => (await db.getMessage(d.message_id))?.body_text))
    expect(bodies.sort()).toEqual(['בוקר', 'ערב'].sort())
  })
})
