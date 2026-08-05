// מימוש AppDB בזיכרון — לבדיקות ולפיתוח מקומי בלי Supabase.
import { randomUUID } from 'node:crypto'
import type { Issue, IssueStatus } from '@make-issues/shared'
import type { AppDB, UserRow } from './interface'

export function createMemoryDb(seedUsers: UserRow[] = []): AppDB {
  const issues: Issue[] = []
  const users: UserRow[] = [...seedUsers]
  const attempts: { username: string; success: boolean; at: Date }[] = []

  return {
    async insertIssue(input) {
      const issue: Issue = {
        id: randomUUID(),
        ...input,
        status: 'open',
        createdAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedBy: null,
      }
      issues.push(issue)
      return issue
    },

    async listIssues(statuses: IssueStatus[]) {
      return issues.filter((i) => statuses.includes(i.status))
    },

    async updateIssueStatus(id, status, resolvedBy) {
      const issue = issues.find((i) => i.id === id)
      if (!issue) return undefined
      issue.status = status
      issue.resolvedAt = new Date().toISOString()
      issue.resolvedBy = resolvedBy
      return issue
    },

    async findUserByUsername(username) {
      return users.find((u) => u.username === username)
    },

    async findUserById(id) {
      return users.find((u) => u.id === id)
    },

    async setRefreshTokenHash(userId, hash) {
      const user = users.find((u) => u.id === userId)
      if (user) user.refreshTokenHash = hash
    },

    async recordLoginAttempt(username, success) {
      attempts.push({ username, success, at: new Date() })
    },

    async countRecentFailedAttempts(username, since) {
      return attempts.filter((a) => a.username === username && !a.success && a.at >= since).length
    },
  }
}
