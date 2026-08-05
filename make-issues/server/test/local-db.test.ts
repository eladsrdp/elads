// בדיקות למימוש ה-DB המקומי מבוסס-קובץ של AppDB — מראה את test/memory-db.test.ts
// אך רץ מול קובץ JSON זמני כדי לוודא שהמימוש מתמיד נכון בין קריאות.
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LocalDb } from '../src/db/local-impl'
import { createLocalDb } from '../src/db/local-impl'

let db: LocalDb
let tempPath: string

beforeEach(() => {
  tempPath = path.join(os.tmpdir(), `make-issues-test-${randomUUID()}.json`)
  writeFileSync(
    tempPath,
    JSON.stringify({
      issues: [],
      users: [{ id: 'u1', username: 'elad', passwordHash: 'hash', refreshTokenHash: null }],
      loginAttempts: [],
    }),
    'utf-8',
  )
  db = createLocalDb(tempPath)
})

afterEach(() => {
  if (existsSync(tempPath)) rmSync(tempPath)
})

describe('issues', () => {
  const input = {
    clientName: 'פיק אנד פאק',
    scenarioName: 'סנכרון הזמנות',
    description: 'שגיאת חיבור',
    issueType: 'סנריו נפל' as const,
    scenarioLink: 'https://make.com/scenario/1',
    runLink: 'https://make.com/run/1',
  }

  it('נוצרת עם status open ו-id', async () => {
    const issue = await db.insertIssue(input)
    expect(issue.status).toBe('open')
    expect(issue.id).toBeTruthy()
    expect(issue.resolvedAt).toBeNull()
  })

  it('listIssues מסנן לפי סטטוס', async () => {
    await db.insertIssue(input)
    const open = await db.listIssues(['open'])
    const handled = await db.listIssues(['handled'])
    expect(open).toHaveLength(1)
    expect(handled).toHaveLength(0)
  })

  it('updateIssueStatus מעדכן status/resolvedAt/resolvedBy', async () => {
    const issue = await db.insertIssue(input)
    const updated = await db.updateIssueStatus(issue.id, 'handled', 'elad')
    expect(updated?.status).toBe('handled')
    expect(updated?.resolvedBy).toBe('elad')
    expect(updated?.resolvedAt).toBeTruthy()
  })

  it('updateIssueStatus על id לא קיים מחזיר undefined', async () => {
    expect(await db.updateIssueStatus('missing', 'handled', 'elad')).toBeUndefined()
  })

  it('נתונים נשמרים ונקראים מחדש מהקובץ (persistence)', async () => {
    const issue = await db.insertIssue(input)
    const db2 = createLocalDb(tempPath)
    const reloaded = await db2.listIssues(['open'])
    expect(reloaded).toHaveLength(1)
    expect(reloaded[0]?.id).toBe(issue.id)
  })
})

describe('users + login attempts', () => {
  it('findUserByUsername/findUserById מוצאים את המשתמש הזרוע', async () => {
    expect((await db.findUserByUsername('elad'))?.id).toBe('u1')
    expect((await db.findUserById('u1'))?.username).toBe('elad')
    expect(await db.findUserByUsername('nobody')).toBeUndefined()
  })

  it('setRefreshTokenHash מעדכן את המשתמש', async () => {
    await db.setRefreshTokenHash('u1', 'newhash')
    expect((await db.findUserById('u1'))?.refreshTokenHash).toBe('newhash')
  })

  it('countRecentFailedAttempts סופר רק כשלים בחלון הזמן', async () => {
    const now = new Date()
    await db.recordLoginAttempt('elad', false)
    await db.recordLoginAttempt('elad', true)
    const since = new Date(now.getTime() - 1000)
    expect(await db.countRecentFailedAttempts('elad', since)).toBe(1)
  })
})

describe('upsertUser (עוזר ל-seed.ts)', () => {
  it('יוצר משתמש חדש כשאין קיים', async () => {
    await db.upsertUser('newuser', 'newhash')
    const user = await db.findUserByUsername('newuser')
    expect(user?.username).toBe('newuser')
    expect(user?.passwordHash).toBe('newhash')
  })

  it('מעדכן passwordHash למשתמש קיים לפי username', async () => {
    await db.upsertUser('elad', 'updated-hash')
    const user = await db.findUserByUsername('elad')
    expect(user?.id).toBe('u1')
    expect(user?.passwordHash).toBe('updated-hash')
  })
})
