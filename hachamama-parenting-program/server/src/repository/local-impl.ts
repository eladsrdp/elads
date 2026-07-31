// מימוש Local של AppDB — in-memory, לפיתוח/בדיקות בלי Supabase אמיתי.
import { randomUUID } from 'node:crypto'
import type {
  AppDB,
  ContentDayRow,
  DailyTriggerRow,
  MessageDeliveryRow,
  MessageRow,
  ParticipantRow,
} from './interface'

export function createLocalDb(): AppDB {
  const participants = new Map<string, ParticipantRow>()
  const contentDays = new Map<number, ContentDayRow>()
  const messages = new Map<string, MessageRow>()
  const dailyTriggers = new Map<string, DailyTriggerRow>()
  const messageDeliveries = new Map<string, MessageDeliveryRow>()
  const sessionWindows = new Map<string, { participant_id: string; opened_at: string; expires_at: string }>()

  return {
    async ping() {},

    async createParticipant(input) {
      const row: ParticipantRow = {
        id: randomUUID(),
        full_name: input.fullName,
        phone: input.phone,
        signup_source_ref: input.signupSourceRef,
        signup_at: input.signupAt,
        day1_date: input.day1Date,
        status: 'active',
      }
      participants.set(row.id, row)
      return row
    },

    async getParticipant(id) {
      return participants.get(id)
    },

    async findParticipantByPhone(phone) {
      return [...participants.values()].find((p) => p.phone === phone)
    },

    async getActiveParticipants() {
      return [...participants.values()].filter((p) => p.status === 'active')
    },

    async markParticipantCompleted(id) {
      const row = participants.get(id)
      if (row) participants.set(id, { ...row, status: 'completed' })
    },

    async createContentDay() {
      throw new Error('not implemented yet — Task 4')
    },
    async getContentDay() {
      throw new Error('not implemented yet — Task 4')
    },
    async getMaxContentDayNumber() {
      throw new Error('not implemented yet — Task 4')
    },
    async createMessage() {
      throw new Error('not implemented yet — Task 4')
    },
    async getMessage() {
      throw new Error('not implemented yet — Task 4')
    },
    async getMessagesForContentDay() {
      throw new Error('not implemented yet — Task 4')
    },
    async createDailyTrigger() {
      throw new Error('not implemented yet — Task 4')
    },
    async findDailyTrigger() {
      throw new Error('not implemented yet — Task 4')
    },
    async getDailyTrigger() {
      throw new Error('not implemented yet — Task 4')
    },
    async getUnsentDailyTriggers() {
      throw new Error('not implemented yet — Task 4')
    },
    async markDailyTriggerSent() {
      throw new Error('not implemented yet — Task 4')
    },
    async markDailyTriggerClicked() {
      throw new Error('not implemented yet — Task 4')
    },
    async createMessageDelivery() {
      throw new Error('not implemented yet — Task 4')
    },
    async getPendingDeliveriesForTrigger() {
      throw new Error('not implemented yet — Task 4')
    },
    async getDuePendingDeliveriesWithClickedTrigger() {
      throw new Error('not implemented yet — Task 4')
    },
    async markDeliverySent() {
      throw new Error('not implemented yet — Task 4')
    },
    async openOrExtendSessionWindow() {
      throw new Error('not implemented yet — Task 5')
    },
    async isSessionWindowOpen() {
      throw new Error('not implemented yet — Task 5')
    },
  }
}
