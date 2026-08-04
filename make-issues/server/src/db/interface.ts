// חוזה ה-DB — מאפשר שני מימושים (זיכרון לבדיקות, Supabase לפרודקשן).
import type { Issue, IssueStatus, WebhookIssueInput } from '@make-issues/shared'

export interface UserRow {
  id: string
  username: string
  passwordHash: string
  refreshTokenHash: string | null
}

export interface AppDB {
  insertIssue(input: WebhookIssueInput): Promise<Issue>
  listIssues(statuses: IssueStatus[]): Promise<Issue[]>
  updateIssueStatus(id: string, status: IssueStatus, resolvedBy: string): Promise<Issue | undefined>

  findUserByUsername(username: string): Promise<UserRow | undefined>
  findUserById(id: string): Promise<UserRow | undefined>
  setRefreshTokenHash(userId: string, hash: string | null): Promise<void>

  recordLoginAttempt(username: string, success: boolean): Promise<void>
  countRecentFailedAttempts(username: string, since: Date): Promise<number>
}
