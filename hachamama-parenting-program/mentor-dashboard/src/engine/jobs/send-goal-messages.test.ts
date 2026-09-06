// hachamama-parenting-program/mentor-dashboard/src/engine/jobs/send-goal-messages.test.ts
import { describe, expect, it } from 'vitest'
import { createFakeMakeClient } from '../make/client'
import { createLocalDb } from '../repository/local-impl'
import { buildGoalFollowUpMessage, sendGoalMessages } from './send-goal-messages'

describe('buildGoalFollowUpMessage', () => {
  it('משבץ את תשובת היעד בתוך הנוסח המאושר', () => {
    const text = buildGoalFollowUpMessage('לדבר יותר בשקט')
    expect(text).toContain('🎯 לדבר יותר בשקט')
    expect(text).toContain('כשיש כיוון ברור')
  })
})

describe('sendGoalMessages', () => {
  it('שולח כטקסט חופשי לכל goal_message שהגיע תורו והיום, ומסמן sent', async () => {
    const db = createLocalDb()
    const participant = await db.createParticipant({
      fullName: 'ישראל ישראלי',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    await db.createGoalMessage({
      participantId: participant.id,
      questionnaireNumber: 3,
      goalAnswer: 'לדבר יותר בשקט',
      scheduledDate: '2023-01-08',
    })
    const makeClient = createFakeMakeClient()

    const result = await sendGoalMessages(db, makeClient, '2023-01-08')

    expect(result.sent).toBe(1)
    expect(makeClient.sessionMessagesSent).toHaveLength(1)
    expect(makeClient.sessionMessagesSent[0]).toMatchObject({
      phone: '+972501234567',
      mediaUrl: null,
      mediaType: null,
    })
    expect(makeClient.sessionMessagesSent[0].bodyText).toContain('🎯 לדבר יותר בשקט')
    // כבר סומן sent — לא due יותר לאותו תאריך
    expect(await db.getDueGoalMessages('2023-01-08')).toHaveLength(0)
  })

  it('לא שולח שוב הודעה שכבר נשלחה', async () => {
    const db = createLocalDb()
    const participant = await db.createParticipant({
      fullName: 'ישראל',
      phone: '+972501234567',
      signupSourceRef: null,
      signupAt: '2023-01-05T10:00:00.000Z',
      day1Date: '2023-01-08',
    })
    const goalMessage = await db.createGoalMessage({
      participantId: participant.id,
      questionnaireNumber: 1,
      goalAnswer: 'יעד',
      scheduledDate: '2023-01-08',
    })
    await db.markGoalMessageSent(goalMessage.id, '2023-01-08T14:00:00.000Z')
    const makeClient = createFakeMakeClient()

    const result = await sendGoalMessages(db, makeClient, '2023-01-08')

    expect(result.sent).toBe(0)
    expect(makeClient.sessionMessagesSent).toHaveLength(0)
  })

  it('שגיאה עבור הודעה אחת לא עוצרת שליחה להודעות אחרות באותה ריצה', async () => {
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
    const failingMessage = await db.createGoalMessage({
      participantId: failingParticipant.id,
      questionnaireNumber: 1,
      goalAnswer: 'יעד א',
      scheduledDate: '2023-01-08',
    })
    const okMessage = await db.createGoalMessage({
      participantId: okParticipant.id,
      questionnaireNumber: 1,
      goalAnswer: 'יעד ב',
      scheduledDate: '2023-01-08',
    })
    const makeClient = createFakeMakeClient()
    const originalSend = makeClient.sendSessionMessage.bind(makeClient)
    makeClient.sendSessionMessage = async (input) => {
      if (input.phone === failingParticipant.phone) throw new Error('כשל מדומה')
      return originalSend(input)
    }

    const result = await sendGoalMessages(db, makeClient, '2023-01-08')

    expect(result.sent).toBe(1)
    expect(result.errors).toEqual([{ goalMessageId: failingMessage.id, error: 'כשל מדומה' }])
    expect(await db.getDueGoalMessages('2023-01-08')).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: failingMessage.id })]),
    )
    expect(await db.getDueGoalMessages('2023-01-08')).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: okMessage.id })]),
    )
  })
})
