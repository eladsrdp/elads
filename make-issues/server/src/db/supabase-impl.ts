// מימוש Supabase של AppDB — לסביבת ענן (Vercel).
import { createClient } from '@supabase/supabase-js'
import type { Issue, IssueStatus } from '@make-issues/shared'
import type { AppDB, UserRow } from './interface'

export function createSupabaseDb(url: string, serviceKey: string): AppDB {
  // Node.js 20 has no native WebSocket. We don't use Supabase Realtime (DB queries only),
  // so provide a no-op transport to bypass the WebSocket check at client init time.
  class NoopWs {
    constructor(_url: string) {}
    close() {}
    send() {}
  }
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    realtime: { transport: NoopWs as any },
  })

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
      createdAt: row.created_at as string,
      resolvedAt: (row.resolved_at as string | null) ?? null,
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
      const { data, error } = await client
        .from('issues')
        .insert({
          client_name: input.clientName,
          scenario_name: input.scenarioName,
          description: input.description ?? null,
          issue_type: input.issueType,
          scenario_link: input.scenarioLink,
          run_link: input.runLink ?? null,
        })
        .select()
        .single()
      if (error) throw new Error(`insertIssue failed: ${error.message}`)
      return toIssue(data)
    },

    async listIssues(statuses) {
      const { data, error } = await client.from('issues').select('*').in('status', statuses)
      if (error) throw new Error(`listIssues failed: ${error.message}`)
      return (data ?? []).map(toIssue)
    },

    async updateIssueStatus(id, status, resolvedBy) {
      const { data, error } = await client
        .from('issues')
        .update({ status, resolved_at: new Date().toISOString(), resolved_by: resolvedBy })
        .eq('id', id)
        .select()
        .maybeSingle()
      if (error) throw new Error(`updateIssueStatus failed: ${error.message}`)
      return data ? toIssue(data) : undefined
    },

    async findUserByUsername(username) {
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle()
      if (error) throw new Error(`findUserByUsername failed: ${error.message}`)
      return data ? toUserRow(data) : undefined
    },

    async findUserById(id) {
      const { data, error } = await client.from('users').select('*').eq('id', id).maybeSingle()
      if (error) throw new Error(`findUserById failed: ${error.message}`)
      return data ? toUserRow(data) : undefined
    },

    async setRefreshTokenHash(userId, hash) {
      const { error } = await client.from('users').update({ refresh_token_hash: hash }).eq('id', userId)
      if (error) throw new Error(`setRefreshTokenHash failed: ${error.message}`)
    },

    async recordLoginAttempt(username, success) {
      const { error } = await client.from('login_attempts').insert({ username, success })
      if (error) throw new Error(`recordLoginAttempt failed: ${error.message}`)
    },

    async countRecentFailedAttempts(username, since) {
      const { count, error } = await client
        .from('login_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('username', username)
        .eq('success', false)
        .gte('created_at', since.toISOString())
      if (error) throw new Error(`countRecentFailedAttempts failed: ${error.message}`)
      return count ?? 0
    },
  }
}
