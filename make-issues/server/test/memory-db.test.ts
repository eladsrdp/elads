// בדיקות למימוש הזיכרון של AppDB — הבסיס לכל בדיקת שרת אחרת בפרויקט.
import { beforeEach, describe, expect, it } from 'vitest'
import type { AppDB } from '../src/db/interface'
import { createMemoryDb } from '../src/db/memory-impl'

let db: AppDB

beforeEach(() => {
  db = createMemoryDb([{ id: 'u1', username: 'elad', passwordHash: 'hash', refreshTokenHash: null }])
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
