// מימוש AppDB מבוסס קובץ JSON — לפיתוח מקומי בלי תלות בענן. לא מתאים ל-Vercel serverless
// (מערכת קבצים לא-מתמידה שם) — שם חובה Supabase; ראו db.ts.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Issue, IssueStatus } from '@make-issues/shared'
import type { AppDB, UserRow } from './interface'

interface FileShape {
  issues: Issue[]
  users: UserRow[]
  loginAttempts: { username: string; success: boolean; at: string }[]
}

// AppDB + עוזר זריעה בלתי-ממשקי (לא חלק מהחוזה) — נחוץ ל-seed.ts כדי ליצור/לעדכן
// משתמש לפי username, בלי להוסיף פעולת "יצירת משתמש" ל-AppDB עצמו (רק login/issues/webhook
// זקוקים לחוזה המלא; זריעה היא עניין תפעולי חד-פעמי, לא חלק מזרימת האפליקציה).
export interface LocalDb extends AppDB {
  upsertUser(username: string, passwordHash: string): Promise<void>
}

function loadOrInit(filePath: string): FileShape {
  if (existsSync(filePath)) {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as FileShape
  }
  return { issues: [], users: [], loginAttempts: [] }
}

function save(filePath: string, data: FileShape): void {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export function createLocalDb(filePath: string): LocalDb {
  // each method re-reads then re-writes the whole file — fine at this app's scale (a handful of
  // team members, a few dozen issues at most), keeps the implementation simple and dependency-free.
  return {
    async insertIssue(input) {
      const data = loadOrInit(filePath)
      const issue: Issue = {
        id: randomUUID(),
        ...input,
        description: input.description ?? null,
        runLink: input.runLink ?? null,
        status: 'open',
        createdAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedBy: null,
      }
      data.issues.push(issue)
      save(filePath, data)
      return issue
    },

    async listIssues(statuses: IssueStatus[]) {
      const data = loadOrInit(filePath)
      return data.issues.filter((i) => statuses.includes(i.status))
    },

    async updateIssueStatus(id, status, resolvedBy) {
      const data = loadOrInit(filePath)
      const issue = data.issues.find((i) => i.id === id)
      if (!issue) return undefined
      issue.status = status
      issue.resolvedAt = new Date().toISOString()
      issue.resolvedBy = resolvedBy
      save(filePath, data)
      return issue
    },

    async findUserByUsername(username) {
      const data = loadOrInit(filePath)
      return data.users.find((u) => u.username === username)
    },

    async findUserById(id) {
      const data = loadOrInit(filePath)
      return data.users.find((u) => u.id === id)
    },

    async setRefreshTokenHash(userId, hash) {
      const data = loadOrInit(filePath)
      const user = data.users.find((u) => u.id === userId)
      if (user) {
        user.refreshTokenHash = hash
        save(filePath, data)
      }
    },

    async recordLoginAttempt(username, success) {
      const data = loadOrInit(filePath)
      data.loginAttempts.push({ username, success, at: new Date().toISOString() })
      save(filePath, data)
    },

    async countRecentFailedAttempts(username, since) {
      const data = loadOrInit(filePath)
      return data.loginAttempts.filter(
        (a) => a.username === username && !a.success && new Date(a.at) >= since,
      ).length
    },

    async upsertUser(username: string, passwordHash: string) {
      const data = loadOrInit(filePath)
      const existing = data.users.find((u) => u.username === username)
      if (existing) {
        existing.passwordHash = passwordHash
      } else {
        data.users.push({ id: randomUUID(), username, passwordHash, refreshTokenHash: null })
      }
      save(filePath, data)
    },
  }
}
