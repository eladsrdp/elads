// hachamama-parenting-program/mentor-dashboard/src/engine/repository/local-impl.test.ts
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

  it('getAllParticipants מחזיר את כולם, בכל סטטוס', async () => {
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

    const all = await db.getAllParticipants()
    expect(all).toHaveLength(2)
  })
})

describe('createLocalDb — content', () => {
  it('שומר ומחזיר content day + הודעות שלו, ממוינות לפי order_in_day', async () => {
    const db = createLocalDb()
    await db.createContentDay({ dayNumber: 1, title: 'יום ראשון בתוכנית' })
    await db.createMessage({
      contentDayNumber: 1,
      sendOffsetTime: '08:00',
      orderInDay: 2,
      bodyText: 'הודעה שנייה',
      mediaUrl: null,
      mediaType: null,
    })
    await db.createMessage({
      contentDayNumber: 1,
      sendOffsetTime: '06:00',
      orderInDay: 1,
      bodyText: 'הודעה ראשונה',
      mediaUrl: null,
      mediaType: null,
    })

    const day = await db.getContentDay(1)
    expect(day?.title).toBe('יום ראשון בתוכנית')

    const msgs = await db.getMessagesForContentDay(1)
    expect(msgs.map((m) => m.body_text)).toEqual(['הודעה ראשונה', 'הודעה שנייה'])
  })

  it('getMaxContentDayNumber מחזיר 0 כשאין תוכן, ואחרת את המקסימום', async () => {
    const db = createLocalDb()
    expect(await db.getMaxContentDayNumber()).toBe(0)
    await db.createContentDay({ dayNumber: 3, title: null })
    await db.createContentDay({ dayNumber: 7, title: null })
    expect(await db.getMaxContentDayNumber()).toBe(7)
  })
})

describe('createLocalDb — daily triggers ומ-message deliveries', () => {
  it('יוצר daily_trigger, מוצא אותו לפי participant+date, ומסמן נשלח/נלחץ', async () => {
    const db = createLocalDb()
    const trigger = await db.createDailyTrigger({
      participantId: 'p1',
      calendarDate: '2023-01-08',
      contentDayNumber: 1,
    })
    expect(trigger.trigger_sent_at).toBeNull()
    expect(trigger.clicked_at).toBeNull()

    const found = await db.findDailyTrigger('p1', '2023-01-08')
    expect(found?.id).toBe(trigger.id)

    await db.markDailyTriggerSent(trigger.id, '2023-01-08T05:00:00.000Z')
    await db.markDailyTriggerClicked(trigger.id, '2023-01-08T06:00:00.000Z')
    const updated = await db.getDailyTrigger(trigger.id)
    expect(updated?.trigger_sent_at).toBe('2023-01-08T05:00:00.000Z')
    expect(updated?.clicked_at).toBe('2023-01-08T06:00:00.000Z')
  })

  it('getUnsentDailyTriggers מחזיר רק טריגרים של אותו תאריך שעדיין לא נשלחו', async () => {
    const db = createLocalDb()
    const t1 = await db.createDailyTrigger({ participantId: 'p1', calendarDate: '2023-01-08', contentDayNumber: 1 })
    await db.createDailyTrigger({ participantId: 'p2', calendarDate: '2023-01-08', contentDayNumber: 1 })
    await db.markDailyTriggerSent(t1.id, '2023-01-08T05:00:00.000Z')
    await db.createDailyTrigger({ participantId: 'p3', calendarDate: '2023-01-09', contentDayNumber: 2 })

    const unsent = await db.getUnsentDailyTriggers('2023-01-08')
    expect(unsent).toHaveLength(1)
    expect(unsent[0].participant_id).toBe('p2')
  })

  it('getPendingDeliveriesForTrigger מחזיר רק pending של אותו trigger שזמנן עבר', async () => {
    const db = createLocalDb()
    const trigger = await db.createDailyTrigger({ participantId: 'p1', calendarDate: '2023-01-08', contentDayNumber: 1 })
    const early = await db.createMessageDelivery({
      participantId: 'p1',
      messageId: 'm1',
      dailyTriggerId: trigger.id,
      scheduledFor: '2023-01-08T05:00:00.000Z',
    })
    await db.createMessageDelivery({
      participantId: 'p1',
      messageId: 'm2',
      dailyTriggerId: trigger.id,
      scheduledFor: '2023-01-08T09:00:00.000Z', // עדיין לא הגיע
    })

    const due = await db.getPendingDeliveriesForTrigger(trigger.id, '2023-01-08T07:00:00.000Z')
    expect(due).toHaveLength(1)
    expect(due[0].id).toBe(early.id)
  })

  it('getDuePendingDeliveriesWithClickedTrigger מתעלם מ-trigger שלא נלחץ', async () => {
    const db = createLocalDb()
    const clicked = await db.createDailyTrigger({ participantId: 'p1', calendarDate: '2023-01-08', contentDayNumber: 1 })
    await db.markDailyTriggerClicked(clicked.id, '2023-01-08T06:00:00.000Z')
    const notClicked = await db.createDailyTrigger({ participantId: 'p2', calendarDate: '2023-01-08', contentDayNumber: 1 })

    const dueForClicked = await db.createMessageDelivery({
      participantId: 'p1',
      messageId: 'm1',
      dailyTriggerId: clicked.id,
      scheduledFor: '2023-01-08T05:00:00.000Z',
    })
    await db.createMessageDelivery({
      participantId: 'p2',
      messageId: 'm1',
      dailyTriggerId: notClicked.id,
      scheduledFor: '2023-01-08T05:00:00.000Z',
    })

    const due = await db.getDuePendingDeliveriesWithClickedTrigger('2023-01-08T07:00:00.000Z')
    expect(due).toHaveLength(1)
    expect(due[0].id).toBe(dueForClicked.id)
  })

  it('markDeliverySent מעדכן status ו-sent_at', async () => {
    const db = createLocalDb()
    const trigger = await db.createDailyTrigger({ participantId: 'p1', calendarDate: '2023-01-08', contentDayNumber: 1 })
    const delivery = await db.createMessageDelivery({
      participantId: 'p1',
      messageId: 'm1',
      dailyTriggerId: trigger.id,
      scheduledFor: '2023-01-08T05:00:00.000Z',
    })
    await db.markDeliverySent(delivery.id, '2023-01-08T05:01:00.000Z')
    const due = await db.getPendingDeliveriesForTrigger(trigger.id, '2023-01-08T07:00:00.000Z')
    expect(due).toHaveLength(0) // כבר sent, לא pending
  })
})

describe('createLocalDb — goal messages', () => {
  it('יוצר goal_message עם sent_at=null', async () => {
    const db = createLocalDb()
    const row = await db.createGoalMessage({
      participantId: 'p1',
      questionnaireNumber: 3,
      goalAnswer: 'לדבר יותר בשקט',
      scheduledDate: '2023-01-08',
    })
    expect(row.id).toBeTruthy()
    expect(row.sent_at).toBeNull()
    expect(row.goal_answer).toBe('לדבר יותר בשקט')
  })

  it('getDueGoalMessages מחזיר רק את אותו תאריך שעדיין לא נשלח', async () => {
    const db = createLocalDb()
    const due = await db.createGoalMessage({
      participantId: 'p1',
      questionnaireNumber: 1,
      goalAnswer: 'יעד א',
      scheduledDate: '2023-01-08',
    })
    await db.createGoalMessage({
      participantId: 'p2',
      questionnaireNumber: 1,
      goalAnswer: 'יעד ב',
      scheduledDate: '2023-01-15', // תאריך אחר
    })
    const alreadySent = await db.createGoalMessage({
      participantId: 'p3',
      questionnaireNumber: 1,
      goalAnswer: 'יעד ג',
      scheduledDate: '2023-01-08',
    })
    await db.markGoalMessageSent(alreadySent.id, '2023-01-08T14:00:00.000Z')

    const result = await db.getDueGoalMessages('2023-01-08')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(due.id)
  })

  it('markGoalMessageSent מעדכן sent_at', async () => {
    const db = createLocalDb()
    const row = await db.createGoalMessage({
      participantId: 'p1',
      questionnaireNumber: 1,
      goalAnswer: 'יעד',
      scheduledDate: '2023-01-08',
    })
    await db.markGoalMessageSent(row.id, '2023-01-08T14:00:00.000Z')
    const due = await db.getDueGoalMessages('2023-01-08')
    expect(due).toHaveLength(0)
  })
})

describe('createLocalDb — session windows', () => {
  it('חלון סגור כברירת מחדל למי שלא לחץ מעולם', async () => {
    const db = createLocalDb()
    expect(await db.isSessionWindowOpen('p1', '2023-01-08T07:00:00.000Z')).toBe(false)
  })

  it('נפתח אחרי openOrExtendSessionWindow, וסגור אחרי expires_at', async () => {
    const db = createLocalDb()
    await db.openOrExtendSessionWindow('p1', '2023-01-09T05:00:00.000Z')
    expect(await db.isSessionWindowOpen('p1', '2023-01-08T10:00:00.000Z')).toBe(true)
    expect(await db.isSessionWindowOpen('p1', '2023-01-09T06:00:00.000Z')).toBe(false)
  })

  it('קריאה שנייה מאריכה את החלון (לא פותחת חלון נפרד)', async () => {
    const db = createLocalDb()
    await db.openOrExtendSessionWindow('p1', '2023-01-08T10:00:00.000Z')
    await db.openOrExtendSessionWindow('p1', '2023-01-09T05:00:00.000Z')
    expect(await db.isSessionWindowOpen('p1', '2023-01-08T23:00:00.000Z')).toBe(true)
  })
})
