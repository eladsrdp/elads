// מימוש Neon (Postgres serverless) של AppDB — חלופה ל-Supabase, ללא auto-pause בטיר החינמי.
// שאילתות בתבנית tagged-template של @neondatabase/serverless — מפורמטות ומאובטחות אוטומטית
// (parameterized מתחת למכסה, בלי concatenation של מחרוזות).
import { neon } from '@neondatabase/serverless'
import type { Issue, IssueStatus } from '@make-issues/shared'
import type { AppDB, UserRow } from './interface'

export function createNeonDb(connectionString: string): AppDB {
  const sql = neon(connectionString)

  function toIssue(row: Record<string, unknown>): Issue {
    return {
      id: row.id as string,
      clientName: row.client_name as string,
      scenarioName: row.scenario_name as string,
      description: (row.description as string | null) ?? null,
      issueType: row.issue_type as Issue['issueType'],
      status: row.status as IssueStatus,
      scenarioLink: row.scenario_link as string,
      runLink: (row.run_link as string | null) ?? null,
      createdAt: (row.created_at as Date).toISOString?.() ?? String(row.created_at),
      resolvedAt: row.resolved_at ? ((row.resolved_at as Date).toISOString?.() ?? String(row.resolved_at)) : null,
      resolvedBy: (row.resolved_by as string | null) ?? null,
    }
  }

  function toUserRow(row: Record<string, unknown>): UserRow {
    return {
      id: row.id as string,
      username: row.username as string,
      passwordHash: row.password_hash as string,
      refreshTokenHash: (row.refresh_token_hash as string | null) ?? null,
    }
  }

  return {
    async insertIssue(input) {
      const rows = await sql`
        insert into issues (client_name, scenario_name, description, issue_type, scenario_link, run_link)
        values (${input.clientName}, ${input.scenarioName}, ${input.description ?? null}, ${input.issueType}, ${input.scenarioLink}, ${input.runLink ?? null})
        returning *
      `
      return toIssue(rows[0] as Record<string, unknown>)
    },

    async listIssues(statuses: IssueStatus[]) {
      const rows = await sql`select * from issues where status = any(${statuses})`
      return (rows as Record<string, unknown>[]).map(toIssue)
    },

    async updateIssueStatus(id, status, resolvedBy) {
      const rows = await sql`
        update issues
        set status = ${status}, resolved_at = now(), resolved_by = ${resolvedBy}
        where id = ${id}
        returning *
      `
      return rows[0] ? toIssue(rows[0] as Record<string, unknown>) : undefined
    },

    async findUserByUsername(username) {
      const rows = await sql`select * from users where username = ${username} limit 1`
      return rows[0] ? toUserRow(rows[0] as Record<string, unknown>) : undefined
    },

    async findUserById(id) {
      const rows = await sql`select * from users where id = ${id} limit 1`
      return rows[0] ? toUserRow(rows[0] as Record<string, unknown>) : undefined
    },

    async setRefreshTokenHash(userId, hash) {
      await sql`update users set refresh_token_hash = ${hash} where id = ${userId}`
    },

    async recordLoginAttempt(username, success) {
      await sql`insert into login_attempts (username, success) values (${username}, ${success})`
    },

    async countRecentFailedAttempts(username, since) {
      const rows = await sql`
        select count(*)::int as count from login_attempts
        where username = ${username} and success = false and created_at >= ${since.toISOString()}
      `
      return (rows[0]?.count as number) ?? 0
    },
  }
}
