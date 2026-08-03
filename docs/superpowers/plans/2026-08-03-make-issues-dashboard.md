# Make Issues Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `make-issues/` — a webhook receiver for Make.com scenario-failure notifications plus a login-protected dashboard where the RDP team triages open issues and reviews resolved ones.

**Architecture:** npm-workspaces monorepo (`shared` / `server` / `client`) mirroring the proven `priority-lite/` layout: Hono API + Supabase(Postgres) storage + Vercel Build Output API deploy, React 19 + Vite + Tailwind v4 client. Full design rationale is in [docs/superpowers/specs/2026-08-03-make-issues-dashboard-design.md](../specs/2026-08-03-make-issues-dashboard-design.md).

**Tech Stack:** Hono, @supabase/supabase-js, jose (JWT), bcryptjs (passwords + refresh token hashing), zod (validation), vitest (tests), React 19, Vite 8, Tailwind v4.

---

## Before You Start

All commands below assume the working directory is the repo root (`C:\Users\EladShuali\Desktop\projects claude\the_five_agents`) unless a task says otherwise. Create the `make-issues/` folder structure exactly as specified — file paths are relative to repo root.

---

### Task 1: Monorepo scaffold + shared types

**Files:**
- Create: `make-issues/package.json`
- Create: `make-issues/.gitignore`
- Create: `make-issues/shared/package.json`
- Create: `make-issues/shared/src/types.ts`

- [ ] **Step 1: Create the root workspace package.json**

`make-issues/package.json`:
```json
{
  "name": "make-issues",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "workspaces": ["shared", "server", "client"],
  "scripts": {
    "dev": "concurrently -n srv,web -c blue,green \"npm run dev -w server\" \"npm run dev -w client\"",
    "build": "node scripts/vercel-build.mjs",
    "test": "npm run test -w server && npm run test -w client",
    "start": "npm run start -w server",
    "seed": "npm run seed -w server"
  },
  "devDependencies": {
    "concurrently": "^9.1.0",
    "esbuild": "^0.28.0"
  }
}
```

- [ ] **Step 2: Create the project .gitignore**

`make-issues/.gitignore`:
```
node_modules/
dist/
.env
accounts.json
*.tsbuildinfo
api/index.js
.vercel/output/
```

- [ ] **Step 3: Create the shared package**

`make-issues/shared/package.json`:
```json
{
  "name": "@make-issues/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/types.ts"
  }
}
```

- [ ] **Step 4: Write the shared types**

`make-issues/shared/src/types.ts`:
```typescript
// טיפוסים משותפים בין השרת לקליינט.

export const ISSUE_TYPES = [
  'עומדות להיגמר האופרציות',
  'נגמרו האופרציות',
  'תקלה בסנריו',
  'סנריו נפל',
] as const

export type IssueType = (typeof ISSUE_TYPES)[number]

export const ISSUE_STATUSES = ['open', 'handled', 'ignored'] as const
export type IssueStatus = (typeof ISSUE_STATUSES)[number]

/** תקלה כפי שהיא מוצגת בלוח הבקרה. */
export interface Issue {
  id: string
  clientName: string
  scenarioName: string
  description: string
  issueType: IssueType
  status: IssueStatus
  scenarioLink: string
  runLink: string
  createdAt: string // ISO
  resolvedAt: string | null // ISO
  resolvedBy: string | null // username
}

/** גוף ה-webhook שנשלח מ-Make.com. */
export interface WebhookIssueInput {
  clientName: string
  scenarioName: string
  description: string
  issueType: IssueType
  scenarioLink: string
  runLink: string
}

/** המשתמש המחובר. */
export interface Me {
  username: string
}
```

- [ ] **Step 5: Install root dependencies**

Run: `npm install --prefix make-issues`
Expected: installs `concurrently` + `esbuild`, creates `make-issues/node_modules` and `package-lock.json`.

- [ ] **Step 6: Commit**

```bash
git add make-issues/package.json make-issues/.gitignore make-issues/shared
git commit -m "feat(make-issues): scaffold monorepo + shared types"
```

---

### Task 2: Server env + data layer

**Files:**
- Create: `make-issues/server/package.json`
- Create: `make-issues/server/tsconfig.json`
- Create: `make-issues/server/src/env.ts`
- Create: `make-issues/server/src/context.ts`
- Create: `make-issues/server/src/db/interface.ts`
- Create: `make-issues/server/src/db/memory-impl.ts`
- Create: `make-issues/server/src/db/supabase-impl.ts`
- Create: `make-issues/server/src/db/db.ts`
- Create: `make-issues/server/supabase-schema.sql`
- Test: `make-issues/server/test/memory-db.test.ts`

- [ ] **Step 1: Create the server package.json**

`make-issues/server/package.json`:
```json
{
  "name": "@make-issues/server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch --import tsx src/index.ts",
    "start": "tsx src/index.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "seed": "tsx src/seed.ts"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.7",
    "@make-issues/shared": "*",
    "@supabase/supabase-js": "^2.49.8",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.4.7",
    "hono": "^4.6.14",
    "jose": "^6.0.8",
    "tsx": "^4.19.2",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^24.12.3",
    "typescript": "~6.0.2",
    "vitest": "^4.1.8"
  }
}
```

- [ ] **Step 2: Create the server tsconfig**

`make-issues/server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Write env.ts**

`make-issues/server/src/env.ts`:
```typescript
// קונפיגורציית סביבה — נטענת פעם אחת ומאומתת עם zod.
import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().default(8787),
  NODE_ENV: z.string().default('development'),
  JWT_SECRET: z.string().default('dev-secret-change-me'),
  WEBHOOK_SECRET: z.string().default('dev-webhook-secret-change-me'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
})

export type Env = z.infer<typeof schema>

const nodeEnv = process.env.NODE_ENV ?? 'development'
const portSource =
  nodeEnv === 'production' ? (process.env.PORT ?? process.env.SERVER_PORT) : process.env.SERVER_PORT

export const env: Env = schema.parse({ ...process.env, PORT: portSource })
export const isProd = env.NODE_ENV === 'production'

if (isProd && (env.JWT_SECRET === 'dev-secret-change-me' || env.WEBHOOK_SECRET === 'dev-webhook-secret-change-me')) {
  throw new Error('JWT_SECRET ו-WEBHOOK_SECRET חייבים להיות ערכים אקראיים בפרודקשן')
}
```

- [ ] **Step 4: Write context.ts**

`make-issues/server/src/context.ts`:
```typescript
import type { Env } from './env'
import type { AppDB } from './db/interface'

export interface AppContext {
  db: AppDB
  env: Env
}
```

- [ ] **Step 5: Write the DB interface**

`make-issues/server/src/db/interface.ts`:
```typescript
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
```

- [ ] **Step 6: Write the failing test for the in-memory implementation**

`make-issues/server/test/memory-db.test.ts`:
```typescript
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
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npm test -w server`
Expected: FAIL — `createMemoryDb` does not exist yet.

- [ ] **Step 8: Implement the in-memory DB**

`make-issues/server/src/db/memory-impl.ts`:
```typescript
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
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npm test -w server`
Expected: PASS (10 tests).

- [ ] **Step 10: Write the Supabase schema**

`make-issues/server/supabase-schema.sql`:
```sql
create extension if not exists pgcrypto;

create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  scenario_name text not null,
  description text not null,
  issue_type text not null,
  status text not null default 'open',
  scenario_link text not null,
  run_link text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);

create index if not exists issues_status_idx on issues (status);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  refresh_token_hash text
);

create table if not exists login_attempts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists login_attempts_username_idx on login_attempts (username, created_at);
```

- [ ] **Step 11: Implement the Supabase DB adapter**

No unit test for this file — it's a thin I/O adapter against a live Supabase project, the same reason `priority-lite/server/src/db/supabase-impl.ts` has no unit test. It's exercised by the manual E2E check in Task 15.

`make-issues/server/src/db/supabase-impl.ts`:
```typescript
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
      description: row.description as string,
      issueType: row.issue_type as Issue['issueType'],
      status: row.status as IssueStatus,
      scenarioLink: row.scenario_link as string,
      runLink: row.run_link as string,
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
          description: input.description,
          issue_type: input.issueType,
          scenario_link: input.scenarioLink,
          run_link: input.runLink,
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
      const { data } = await client.from('users').select('*').eq('username', username).maybeSingle()
      return data ? toUserRow(data) : undefined
    },

    async findUserById(id) {
      const { data } = await client.from('users').select('*').eq('id', id).maybeSingle()
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
```

- [ ] **Step 12: Write the DB factory**

`make-issues/server/src/db/db.ts`:
```typescript
// בוחר Supabase אם יש credentials, אחרת נופל ל-DB בזיכרון (פיתוח מקומי בלבד).
import type { AppDB } from './interface'
import { createMemoryDb } from './memory-impl'
import { createSupabaseDb } from './supabase-impl'

export function createDb(url: string | undefined, serviceKey: string | undefined): AppDB {
  if (url && serviceKey) return createSupabaseDb(url, serviceKey)
  return createMemoryDb()
}
```

- [ ] **Step 13: Typecheck**

Run: `npm run typecheck -w server` (from `make-issues/`)
Expected: no errors.

- [ ] **Step 14: Commit**

```bash
git add make-issues/server/package.json make-issues/server/tsconfig.json make-issues/server/src/env.ts make-issues/server/src/context.ts make-issues/server/src/db make-issues/server/supabase-schema.sql make-issues/server/test/memory-db.test.ts
git commit -m "feat(make-issues): server env + dual DB layer (memory/supabase)"
```

---

### Task 3: Password + token utilities

**Files:**
- Create: `make-issues/server/src/auth/password.ts`
- Create: `make-issues/server/src/auth/tokens.ts`
- Test: `make-issues/server/test/tokens.test.ts`

- [ ] **Step 1: Write the failing test**

`make-issues/server/test/tokens.test.ts`:
```typescript
// בדיקות ל-hashing סיסמאות, access token (JWT), ורצועת refresh token.
import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../src/auth/password'
import {
  ACCESS_TOKEN_TTL_SEC,
  createAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  parseRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../src/auth/tokens'

const SECRET = 'test-secret'

describe('password hashing', () => {
  it('hash שונה מהסיסמה המקורית, ו-verify מזהה נכון/שגוי', async () => {
    const hash = await hashPassword('my-password')
    expect(hash).not.toBe('my-password')
    expect(await verifyPassword('my-password', hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})

describe('access token', () => {
  it('נחתם ומאומת עם אותו secret ומחזיר את שם המשתמש', async () => {
    const token = await createAccessToken('elad', SECRET)
    expect(await verifyAccessToken(token, SECRET)).toBe('elad')
  })

  it('נדחה עם secret שגוי', async () => {
    const token = await createAccessToken('elad', SECRET)
    expect(await verifyAccessToken(token, 'wrong-secret')).toBeNull()
  })

  it('טוקן פגום נדחה בלי לזרוק שגיאה', async () => {
    expect(await verifyAccessToken('not-a-jwt', SECRET)).toBeNull()
  })

  it('ה-TTL הוא שעה אחת', () => {
    expect(ACCESS_TOKEN_TTL_SEC).toBe(3600)
  })
})

describe('refresh token', () => {
  it('מקודד את userId בגלוי ואת ה-secret בנפרד', () => {
    const { token, secret } = generateRefreshToken('user-123')
    const parsed = parseRefreshToken(token)
    expect(parsed?.userId).toBe('user-123')
    expect(parsed?.secret).toBe(secret)
  })

  it('hash/verify מזהים secret נכון/שגוי', async () => {
    const { secret } = generateRefreshToken('user-123')
    const hash = await hashRefreshToken(secret)
    expect(await verifyRefreshToken(secret, hash)).toBe(true)
    expect(await verifyRefreshToken('wrong-secret', hash)).toBe(false)
  })

  it('parseRefreshToken דוחה טוקן בלי נקודה מפרידה', () => {
    expect(parseRefreshToken('no-dot-here')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w server`
Expected: FAIL — `../src/auth/password` and `../src/auth/tokens` don't exist yet.

- [ ] **Step 3: Implement password.ts**

`make-issues/server/src/auth/password.ts`:
```typescript
// hashing סיסמאות עם bcryptjs (pure-JS — נמנע מבעיות native binding בבנדל esbuild/Vercel).
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

- [ ] **Step 4: Implement tokens.ts**

`make-issues/server/src/auth/tokens.ts`:
```typescript
// Access token: JWT קצר-טווח. Refresh token: userId גלוי + secret אקראי, ה-secret נשמר כ-hash בלבד
// (מאפשר לאתר את המשתמש בלי לחפש hash הפיך, בעוד שה-secret עצמו לא ניתן לניחוש).
import { SignJWT, jwtVerify } from 'jose'
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'

const ALG = 'HS256'
const REFRESH_SALT_ROUNDS = 12

export const ACCESS_TOKEN_COOKIE = 'mi_access'
export const REFRESH_TOKEN_COOKIE = 'mi_refresh'
export const ACCESS_TOKEN_TTL_SEC = 60 * 60 // שעה
export const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60 // 30 יום

export async function createAccessToken(username: string, secret: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SEC}s`)
    .sign(new TextEncoder().encode(secret))
}

export async function verifyAccessToken(token: string, secret: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    return typeof payload.username === 'string' ? payload.username : null
  } catch {
    return null
  }
}

export function generateRefreshToken(userId: string): { token: string; secret: string } {
  const secret = randomBytes(32).toString('hex')
  return { token: `${userId}.${secret}`, secret }
}

export function parseRefreshToken(token: string): { userId: string; secret: string } | null {
  const idx = token.indexOf('.')
  if (idx <= 0) return null
  return { userId: token.slice(0, idx), secret: token.slice(idx + 1) }
}

export async function hashRefreshToken(secret: string): Promise<string> {
  return bcrypt.hash(secret, REFRESH_SALT_ROUNDS)
}

export async function verifyRefreshToken(secret: string, hash: string): Promise<boolean> {
  return bcrypt.compare(secret, hash)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -w server`
Expected: PASS (all tests from Task 2 + Task 3).

- [ ] **Step 6: Commit**

```bash
git add make-issues/server/src/auth/password.ts make-issues/server/src/auth/tokens.ts make-issues/server/test/tokens.test.ts
git commit -m "feat(make-issues): password hashing + access/refresh token utilities"
```

---

### Task 4: Login rate limiting

**Files:**
- Create: `make-issues/server/src/auth/rateLimit.ts`
- Test: `make-issues/server/test/rateLimit.test.ts`

- [ ] **Step 1: Write the failing test**

`make-issues/server/test/rateLimit.test.ts`:
```typescript
// בדיקות לחסימת ניסיונות login חוזרים — DB-backed (לא בזיכרון-תהליך, כדי לעבוד על Vercel serverless).
import { describe, expect, it } from 'vitest'
import { createMemoryDb } from '../src/db/memory-impl'
import { isLoginRateLimited, LOGIN_MAX_ATTEMPTS } from '../src/auth/rateLimit'

describe('isLoginRateLimited', () => {
  it('false כשאין ניסיונות כושלים', async () => {
    const db = createMemoryDb()
    expect(await isLoginRateLimited(db, 'elad')).toBe(false)
  })

  it('true אחרי הגעה למכסת הכשלים', async () => {
    const db = createMemoryDb()
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) {
      await db.recordLoginAttempt('elad', false)
    }
    expect(await isLoginRateLimited(db, 'elad')).toBe(true)
  })

  it('הצלחות לא נספרות בחסימה', async () => {
    const db = createMemoryDb()
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) {
      await db.recordLoginAttempt('elad', true)
    }
    expect(await isLoginRateLimited(db, 'elad')).toBe(false)
  })

  it('משתמש אחר לא מושפע מכשלים של משתמש אחר', async () => {
    const db = createMemoryDb()
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) {
      await db.recordLoginAttempt('elad', false)
    }
    expect(await isLoginRateLimited(db, 'other')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w server`
Expected: FAIL — `../src/auth/rateLimit` doesn't exist yet.

- [ ] **Step 3: Implement rateLimit.ts**

`make-issues/server/src/auth/rateLimit.ts`:
```typescript
// חסימת ניסיונות login חוזרים — נבדק מול login_attempts ב-DB, לא בזיכרון-תהליך
// (Vercel serverless functions הן חסרות מצב בין הרצות — זיכרון-תהליך לא היה עובד).
import type { AppDB } from '../db/interface'

export const LOGIN_WINDOW_MS = 15 * 60 * 1000 // 15 דקות
export const LOGIN_MAX_ATTEMPTS = 5

export async function isLoginRateLimited(db: AppDB, username: string): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS)
  const failures = await db.countRecentFailedAttempts(username, since)
  return failures >= LOGIN_MAX_ATTEMPTS
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w server`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add make-issues/server/src/auth/rateLimit.ts make-issues/server/test/rateLimit.test.ts
git commit -m "feat(make-issues): DB-backed login rate limiting"
```

---

### Task 5: Webhook ingestion route

**Files:**
- Create: `make-issues/server/src/auth/webhookAuth.ts`
- Create: `make-issues/server/src/routes/webhook.ts`
- Test: `make-issues/server/test/webhook.test.ts`

- [ ] **Step 1: Write the failing test**

`make-issues/server/test/webhook.test.ts`:
```typescript
// בדיקות ל-POST /issues של ה-webhook: אימות secret, ולידציית payload, הכנסה ל-DB.
import { describe, expect, it } from 'vitest'
import { createMemoryDb } from '../src/db/memory-impl'
import { createWebhookRoutes } from '../src/routes/webhook'
import type { AppContext } from '../src/context'
import { env } from '../src/env'

function makeCtx(): AppContext {
  return { db: createMemoryDb(), env: { ...env, WEBHOOK_SECRET: 'the-secret' } }
}

const validBody = {
  clientName: 'פיק אנד פאק',
  scenarioName: 'סנכרון הזמנות',
  description: 'שגיאת חיבור ל-API',
  issueType: 'סנריו נפל',
  scenarioLink: 'https://www.make.com/en/scenario/1',
  runLink: 'https://www.make.com/en/scenario/1/run/2',
}

describe('POST /issues', () => {
  it('201-שקול (ok:true) עם secret ו-payload תקינים, ונכתב ל-DB', async () => {
    const ctx = makeCtx()
    const app = createWebhookRoutes(ctx)
    const res = await app.request('/issues', {
      method: 'POST',
      headers: { Authorization: 'Bearer the-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; id: string }
    expect(body.ok).toBe(true)
    expect(await ctx.db.listIssues(['open'])).toHaveLength(1)
  })

  it('401 בלי header Authorization', async () => {
    const ctx = makeCtx()
    const app = createWebhookRoutes(ctx)
    const res = await app.request('/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    })
    expect(res.status).toBe(401)
  })

  it('401 עם secret שגוי', async () => {
    const ctx = makeCtx()
    const app = createWebhookRoutes(ctx)
    const res = await app.request('/issues', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    })
    expect(res.status).toBe(401)
  })

  it('400 כש-issueType מחוץ לרשימה הקבועה', async () => {
    const ctx = makeCtx()
    const app = createWebhookRoutes(ctx)
    const res = await app.request('/issues', {
      method: 'POST',
      headers: { Authorization: 'Bearer the-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, issueType: 'משהו אחר' }),
    })
    expect(res.status).toBe(400)
    expect(await ctx.db.listIssues(['open'])).toHaveLength(0)
  })

  it('400 כש-scenarioLink אינו URL תקין', async () => {
    const ctx = makeCtx()
    const app = createWebhookRoutes(ctx)
    const res = await app.request('/issues', {
      method: 'POST',
      headers: { Authorization: 'Bearer the-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, scenarioLink: 'not-a-url' }),
    })
    expect(res.status).toBe(400)
  })

  it('400 כשחסר שדה חובה', async () => {
    const ctx = makeCtx()
    const app = createWebhookRoutes(ctx)
    const { clientName: _clientName, ...missingClientName } = validBody
    const res = await app.request('/issues', {
      method: 'POST',
      headers: { Authorization: 'Bearer the-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify(missingClientName),
    })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w server`
Expected: FAIL — `../src/routes/webhook` doesn't exist yet.

- [ ] **Step 3: Implement webhookAuth.ts**

`make-issues/server/src/auth/webhookAuth.ts`:
```typescript
// מאמת את ה-secret המשותף עם Make.com בהדר Authorization, בהשוואת-זמן-קבוע.
import type { Context, Next } from 'hono'
import { timingSafeEqual } from 'node:crypto'

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

export function requireWebhookSecret(secret: string) {
  return async (c: Context, next: Next) => {
    const header = c.req.header('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token || !safeEqual(token, secret)) {
      return c.json({ error: 'לא מורשה' }, 401)
    }
    await next()
  }
}
```

- [ ] **Step 4: Implement the webhook route**

`make-issues/server/src/routes/webhook.ts`:
```typescript
// POST /api/webhook/issues — מקבל התראות כשל סנריו מ-Make.com.
import { Hono } from 'hono'
import { z } from 'zod'
import { ISSUE_TYPES } from '@make-issues/shared'
import type { AppContext } from '../context'
import { requireWebhookSecret } from '../auth/webhookAuth'

const webhookSchema = z.object({
  clientName: z.string().min(1).max(200),
  scenarioName: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  issueType: z.enum(ISSUE_TYPES),
  scenarioLink: z.string().url(),
  runLink: z.string().url(),
})

export function createWebhookRoutes(ctx: AppContext) {
  const app = new Hono()
  app.use('*', requireWebhookSecret(ctx.env.WEBHOOK_SECRET))

  app.post('/issues', async (c) => {
    const json = await c.req.json().catch(() => null)
    const body = webhookSchema.safeParse(json)
    if (!body.success) return c.json({ error: 'payload לא תקין' }, 400)

    // לוג מטא-דאטה בלבד — לא כל ה-payload — היגיינת לוגים תקינה גם כשאין PII.
    console.log('[webhook] issue received', {
      clientName: body.data.clientName,
      scenarioName: body.data.scenarioName,
      issueType: body.data.issueType,
    })

    const issue = await ctx.db.insertIssue(body.data)
    return c.json({ ok: true, id: issue.id })
  })

  return app
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -w server`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add make-issues/server/src/auth/webhookAuth.ts make-issues/server/src/routes/webhook.ts make-issues/server/test/webhook.test.ts
git commit -m "feat(make-issues): webhook ingestion endpoint for Make.com scenario failures"
```

---

### Task 6: Auth routes + requireAuth middleware

**Files:**
- Create: `make-issues/server/src/auth/middleware.ts`
- Create: `make-issues/server/src/routes/auth.ts`
- Test: `make-issues/server/test/auth.test.ts`

- [ ] **Step 1: Write the failing test**

`make-issues/server/test/auth.test.ts`:
```typescript
// בדיקות ל-/api/auth: login, refresh (עם רוטציה), logout, me, ורייט-לימיט.
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryDb } from '../src/db/memory-impl'
import { hashPassword } from '../src/auth/password'
import { createAuthRoutes } from '../src/routes/auth'
import type { AppContext } from '../src/context'
import { env } from '../src/env'
import type { AppDB } from '../src/db/interface'

let db: AppDB
let ctx: AppContext

function getCookieValue(res: Response, name: string): string | undefined {
  const raw = res.headers.get('set-cookie') ?? ''
  const match = raw.match(new RegExp(`${name}=([^;]+)`))
  return match?.[1]
}

beforeEach(async () => {
  db = createMemoryDb([
    { id: 'u1', username: 'elad', passwordHash: await hashPassword('secret123'), refreshTokenHash: null },
  ])
  ctx = { db, env: { ...env, JWT_SECRET: 'test-jwt-secret' } }
})

describe('POST /login', () => {
  it('מצליח עם שם משתמש וסיסמה נכונים, מחזיר username ומגדיר שני cookies', async () => {
    const app = createAuthRoutes(ctx)
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'elad', password: 'secret123' }),
    })
    expect(res.status).toBe(200)
    expect((await res.json()) as { username: string }).toEqual({ username: 'elad' })
    const setCookies = res.headers.get('set-cookie') ?? ''
    expect(setCookies).toContain('mi_access=')
  })

  it('401 עם סיסמה שגויה, ורושם ניסיון כושל', async () => {
    const app = createAuthRoutes(ctx)
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'elad', password: 'wrong' }),
    })
    expect(res.status).toBe(401)
    expect(await db.countRecentFailedAttempts('elad', new Date(Date.now() - 1000))).toBe(1)
  })

  it('401 למשתמש לא קיים', async () => {
    const app = createAuthRoutes(ctx)
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nobody', password: 'x' }),
    })
    expect(res.status).toBe(401)
  })

  it('429 אחרי חריגה ממכסת הניסיונות הכושלים', async () => {
    const app = createAuthRoutes(ctx)
    for (let i = 0; i < 5; i++) {
      await app.request('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'elad', password: 'wrong' }),
      })
    }
    const res = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'elad', password: 'secret123' }),
    })
    expect(res.status).toBe(429)
  })
})

describe('POST /refresh', () => {
  it('מנפיק access token חדש ומסובב את ה-refresh token', async () => {
    const app = createAuthRoutes(ctx)
    const loginRes = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'elad', password: 'secret123' }),
    })
    const refreshCookie = getCookieValue(loginRes, 'mi_refresh')
    expect(refreshCookie).toBeTruthy()

    const refreshRes = await app.request('/refresh', {
      method: 'POST',
      headers: { Cookie: `mi_refresh=${refreshCookie}` },
    })
    expect(refreshRes.status).toBe(200)
    const newRefreshCookie = getCookieValue(refreshRes, 'mi_refresh')
    expect(newRefreshCookie).toBeTruthy()
    expect(newRefreshCookie).not.toBe(refreshCookie)

    // הטוקן הישן כבר לא תקף אחרי הרוטציה
    const reuseRes = await app.request('/refresh', {
      method: 'POST',
      headers: { Cookie: `mi_refresh=${refreshCookie}` },
    })
    expect(reuseRes.status).toBe(401)
  })

  it('401 בלי refresh cookie', async () => {
    const app = createAuthRoutes(ctx)
    const res = await app.request('/refresh', { method: 'POST' })
    expect(res.status).toBe(401)
  })
})

describe('POST /logout', () => {
  it('מנקה את ה-refresh token מה-DB', async () => {
    const app = createAuthRoutes(ctx)
    const loginRes = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'elad', password: 'secret123' }),
    })
    const refreshCookie = getCookieValue(loginRes, 'mi_refresh')

    await app.request('/logout', { method: 'POST', headers: { Cookie: `mi_refresh=${refreshCookie}` } })
    expect((await db.findUserById('u1'))?.refreshTokenHash).toBeNull()
  })
})

describe('GET /me', () => {
  it('401 בלי access cookie תקף', async () => {
    const app = createAuthRoutes(ctx)
    const res = await app.request('/me')
    expect(res.status).toBe(401)
  })

  it('מחזיר username עם access cookie תקף', async () => {
    const app = createAuthRoutes(ctx)
    const loginRes = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'elad', password: 'secret123' }),
    })
    const accessCookie = getCookieValue(loginRes, 'mi_access')
    const res = await app.request('/me', { headers: { Cookie: `mi_access=${accessCookie}` } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ username: 'elad' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w server`
Expected: FAIL — `../src/routes/auth` and `../src/auth/middleware` don't exist yet.

- [ ] **Step 3: Implement the requireAuth middleware**

`make-issues/server/src/auth/middleware.ts`:
```typescript
// Middleware שדורש access token תקף ומציב את שם המשתמש על ה-context.
import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { ACCESS_TOKEN_COOKIE, verifyAccessToken } from './tokens'

export type AuthVars = { Variables: { username: string } }

export function requireAuth(secret: string) {
  return createMiddleware<AuthVars>(async (c, next) => {
    const token = getCookie(c, ACCESS_TOKEN_COOKIE)
    const username = token ? await verifyAccessToken(token, secret) : null
    if (!username) return c.json({ error: 'נדרשת התחברות' }, 401)
    c.set('username', username)
    await next()
  })
}
```

- [ ] **Step 4: Implement the auth routes**

`make-issues/server/src/routes/auth.ts`:
```typescript
// /api/auth — login (username+password), refresh (רוטציית refresh token), logout, me.
import { Hono } from 'hono'
import { z } from 'zod'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { AppContext } from '../context'
import { isLoginRateLimited } from '../auth/rateLimit'
import { requireAuth, type AuthVars } from '../auth/middleware'
import { verifyPassword } from '../auth/password'
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SEC,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_SEC,
  createAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  parseRefreshToken,
  verifyRefreshToken,
} from '../auth/tokens'

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) })

export function createAuthRoutes(ctx: AppContext) {
  const app = new Hono<AuthVars>()

  const cookieOpts = (maxAgeSec: number) => ({
    httpOnly: true,
    secure: ctx.env.NODE_ENV === 'production',
    sameSite: 'Strict' as const,
    path: '/',
    maxAge: maxAgeSec,
  })

  async function issueSession(c: Parameters<Parameters<typeof app.post>[1]>[0], userId: string, username: string) {
    const accessToken = await createAccessToken(username, ctx.env.JWT_SECRET)
    const { token: refreshToken, secret } = generateRefreshToken(userId)
    await ctx.db.setRefreshTokenHash(userId, await hashRefreshToken(secret))
    setCookie(c, ACCESS_TOKEN_COOKIE, accessToken, cookieOpts(ACCESS_TOKEN_TTL_SEC))
    setCookie(c, REFRESH_TOKEN_COOKIE, refreshToken, cookieOpts(REFRESH_TOKEN_TTL_SEC))
  }

  app.post('/login', async (c) => {
    const json = await c.req.json().catch(() => null)
    const body = loginSchema.safeParse(json)
    if (!body.success) return c.json({ error: 'שם משתמש וסיסמה נדרשים' }, 400)
    const { username, password } = body.data

    if (await isLoginRateLimited(ctx.db, username)) {
      return c.json({ error: 'יותר מדי ניסיונות — נסה שוב מאוחר יותר' }, 429)
    }

    const user = await ctx.db.findUserByUsername(username)
    const ok = user ? await verifyPassword(password, user.passwordHash) : false
    await ctx.db.recordLoginAttempt(username, ok)
    if (!user || !ok) return c.json({ error: 'שם משתמש או סיסמה שגויים' }, 401)

    await issueSession(c, user.id, user.username)
    return c.json({ username: user.username })
  })

  app.post('/refresh', async (c) => {
    const raw = getCookie(c, REFRESH_TOKEN_COOKIE)
    const parsed = raw ? parseRefreshToken(raw) : null
    const user = parsed ? await ctx.db.findUserById(parsed.userId) : undefined
    const valid =
      parsed && user?.refreshTokenHash ? await verifyRefreshToken(parsed.secret, user.refreshTokenHash) : false

    if (!parsed || !user || !valid) {
      deleteCookie(c, ACCESS_TOKEN_COOKIE, { path: '/' })
      deleteCookie(c, REFRESH_TOKEN_COOKIE, { path: '/' })
      return c.json({ error: 'נדרשת התחברות' }, 401)
    }

    await issueSession(c, user.id, user.username)
    return c.json({ username: user.username })
  })

  app.post('/logout', async (c) => {
    const raw = getCookie(c, REFRESH_TOKEN_COOKIE)
    const parsed = raw ? parseRefreshToken(raw) : null
    if (parsed) await ctx.db.setRefreshTokenHash(parsed.userId, null)
    deleteCookie(c, ACCESS_TOKEN_COOKIE, { path: '/' })
    deleteCookie(c, REFRESH_TOKEN_COOKIE, { path: '/' })
    return c.json({ ok: true })
  })

  app.get('/me', requireAuth(ctx.env.JWT_SECRET), (c) => {
    return c.json({ username: c.get('username') })
  })

  return app
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -w server`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add make-issues/server/src/auth/middleware.ts make-issues/server/src/routes/auth.ts make-issues/server/test/auth.test.ts
git commit -m "feat(make-issues): username/password auth with short-lived access + rotating refresh tokens"
```

---

### Task 7: Issues API routes

**Files:**
- Create: `make-issues/server/src/routes/issues.ts`
- Test: `make-issues/server/test/issues.test.ts`

- [ ] **Step 1: Write the failing test**

`make-issues/server/test/issues.test.ts`:
```typescript
// בדיקות ל-/api/issues: רשימה לפי סטטוס (עם מיון), ועדכון סטטוס (טופל/להתעלם).
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryDb } from '../src/db/memory-impl'
import { hashPassword } from '../src/auth/password'
import { createAuthRoutes } from '../src/routes/auth'
import { createIssueRoutes } from '../src/routes/issues'
import type { AppContext } from '../src/context'
import { env } from '../src/env'
import type { AppDB } from '../src/db/interface'

let db: AppDB
let ctx: AppContext
let accessCookie: string

function getCookieValue(res: Response, name: string): string | undefined {
  const raw = res.headers.get('set-cookie') ?? ''
  const match = raw.match(new RegExp(`${name}=([^;]+)`))
  return match?.[1]
}

beforeEach(async () => {
  db = createMemoryDb([
    { id: 'u1', username: 'elad', passwordHash: await hashPassword('secret123'), refreshTokenHash: null },
  ])
  ctx = { db, env: { ...env, JWT_SECRET: 'test-jwt-secret' } }

  const authApp = createAuthRoutes(ctx)
  const loginRes = await authApp.request('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'elad', password: 'secret123' }),
  })
  accessCookie = getCookieValue(loginRes, 'mi_access')!
})

async function seedIssue(overrides: Partial<Parameters<AppDB['insertIssue']>[0]> = {}) {
  return db.insertIssue({
    clientName: 'פיק אנד פאק',
    scenarioName: 'סנכרון הזמנות',
    description: 'שגיאה',
    issueType: 'סנריו נפל',
    scenarioLink: 'https://make.com/scenario/1',
    runLink: 'https://make.com/run/1',
    ...overrides,
  })
}

describe('GET /', () => {
  it('401 בלי אימות', async () => {
    const app = createIssueRoutes(ctx)
    const res = await app.request('/?status=open')
    expect(res.status).toBe(401)
  })

  it('מחזיר רק תקלות open כברירת מחדל', async () => {
    await seedIssue()
    const app = createIssueRoutes(ctx)
    const res = await app.request('/', { headers: { Cookie: `mi_access=${accessCookie}` } })
    const body = (await res.json()) as { issues: unknown[] }
    expect(body.issues).toHaveLength(1)
  })

  it('תומך בכמה סטטוסים מופרדים בפסיק', async () => {
    const issue = await seedIssue()
    await db.updateIssueStatus(issue.id, 'handled', 'elad')
    await seedIssue()

    const app = createIssueRoutes(ctx)
    const res = await app.request('/?status=handled,ignored', { headers: { Cookie: `mi_access=${accessCookie}` } })
    const body = (await res.json()) as { issues: { status: string }[] }
    expect(body.issues).toHaveLength(1)
    expect(body.issues[0].status).toBe('handled')
  })

  it('400 עם ערך status לא מוכר', async () => {
    const app = createIssueRoutes(ctx)
    const res = await app.request('/?status=bogus', { headers: { Cookie: `mi_access=${accessCookie}` } })
    expect(res.status).toBe(400)
  })
})

describe('PATCH /:id', () => {
  it('מסמן תקלה כטופלה ורושם resolvedBy מה-access token', async () => {
    const issue = await seedIssue()
    const app = createIssueRoutes(ctx)
    const res = await app.request(`/${issue.id}`, {
      method: 'PATCH',
      headers: { Cookie: `mi_access=${accessCookie}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'handled' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { issue: { status: string; resolvedBy: string } }
    expect(body.issue.status).toBe('handled')
    expect(body.issue.resolvedBy).toBe('elad')
  })

  it('404 על id לא קיים', async () => {
    const app = createIssueRoutes(ctx)
    const res = await app.request('/missing-id', {
      method: 'PATCH',
      headers: { Cookie: `mi_access=${accessCookie}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'handled' }),
    })
    expect(res.status).toBe(404)
  })

  it('400 על סטטוס לא חוקי', async () => {
    const issue = await seedIssue()
    const app = createIssueRoutes(ctx)
    const res = await app.request(`/${issue.id}`, {
      method: 'PATCH',
      headers: { Cookie: `mi_access=${accessCookie}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'open' }),
    })
    expect(res.status).toBe(400)
  })

  it('401 בלי אימות', async () => {
    const issue = await seedIssue()
    const app = createIssueRoutes(ctx)
    const res = await app.request(`/${issue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'handled' }),
    })
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w server`
Expected: FAIL — `../src/routes/issues` doesn't exist yet.

- [ ] **Step 3: Implement the issues routes**

`make-issues/server/src/routes/issues.ts`:
```typescript
// /api/issues — GET (רשימה לפי סטטוס, ממוינת מהחדש), PATCH (סימון טופל/להתעלם).
import { Hono } from 'hono'
import { z } from 'zod'
import { ISSUE_STATUSES, type Issue, type IssueStatus } from '@make-issues/shared'
import type { AppContext } from '../context'
import { requireAuth, type AuthVars } from '../auth/middleware'

function sortNewestFirst(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => (b.resolvedAt ?? b.createdAt).localeCompare(a.resolvedAt ?? a.createdAt))
}

function parseStatuses(param: string): IssueStatus[] | null {
  const candidates = param.split(',').map((s) => s.trim())
  const valid = candidates.filter((s): s is IssueStatus => (ISSUE_STATUSES as readonly string[]).includes(s))
  return valid.length === candidates.length && valid.length > 0 ? valid : null
}

export function createIssueRoutes(ctx: AppContext) {
  const app = new Hono<AuthVars>()
  app.use('*', requireAuth(ctx.env.JWT_SECRET))

  app.get('/', async (c) => {
    const statuses = parseStatuses(c.req.query('status') ?? 'open')
    if (!statuses) return c.json({ error: 'status לא תקין' }, 400)
    const issues = await ctx.db.listIssues(statuses)
    return c.json({ issues: sortNewestFirst(issues) })
  })

  const patchSchema = z.object({ status: z.enum(['handled', 'ignored']) })
  app.patch('/:id', async (c) => {
    const json = await c.req.json().catch(() => null)
    const body = patchSchema.safeParse(json)
    if (!body.success) return c.json({ error: 'סטטוס לא תקין' }, 400)

    const username = c.get('username')
    const updated = await ctx.db.updateIssueStatus(c.req.param('id'), body.data.status, username)
    if (!updated) return c.json({ error: 'תקלה לא נמצאה' }, 404)
    return c.json({ issue: updated })
  })

  return app
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w server`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add make-issues/server/src/routes/issues.ts make-issues/server/test/issues.test.ts
git commit -m "feat(make-issues): issues list/patch API with sort and auth"
```

---

### Task 8: App assembly + server entrypoint + seed script

**Files:**
- Create: `make-issues/server/src/app.ts`
- Create: `make-issues/server/src/index.ts`
- Create: `make-issues/server/src/seed.ts`
- Create: `make-issues/server/accounts.example.json`
- Create: `make-issues/server/.env.example`

- [ ] **Step 1: Write the app assembly**

`make-issues/server/src/app.ts`:
```typescript
// הרכבת אפליקציית ה-Hono — מופרד מ-index.ts כדי שבדיקות/Vercel entry יוכלו להרכיב app בעצמם.
import { Hono } from 'hono'
import type { AppContext } from './context'
import { createAuthRoutes } from './routes/auth'
import { createIssueRoutes } from './routes/issues'
import { createWebhookRoutes } from './routes/webhook'

export function createApp(ctx: AppContext) {
  const app = new Hono()

  app.get('/api/health', (c) => c.json({ ok: true }))
  app.route('/api/auth', createAuthRoutes(ctx))
  app.route('/api/issues', createIssueRoutes(ctx))
  app.route('/api/webhook', createWebhookRoutes(ctx))

  app.onError((err, c) => {
    console.error('[server error]', err)
    return c.json({ error: 'שגיאת שרת' }, 500)
  })

  return app
}
```

- [ ] **Step 2: Write the local dev entrypoint**

`make-issues/server/src/index.ts`:
```typescript
// נקודת הכניסה המקומית — מרימה שרת Node עם DB אמיתי/זיכרון לפי env.
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { existsSync } from 'node:fs'
import { createApp } from './app'
import { createDb } from './db/db'
import { env, isProd } from './env'

const db = createDb(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
const app = createApp({ db, env })

const clientDist = '../client/dist'
if (isProd && existsSync(clientDist)) {
  app.use('*', serveStatic({ root: clientDist }))
  app.get('*', serveStatic({ path: `${clientDist}/index.html` }))
}

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`🚀 Make Issues server — http://localhost:${info.port}`)
})
```

- [ ] **Step 3: Write the account seed script**

`make-issues/server/src/seed.ts`:
```typescript
// זורע חשבונות משתמש קבועים (3-4 עמיתים) מתוך accounts.json מקומי (לא ב-git).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { hashPassword } from './auth/password'
import { env } from './env'

interface SeedAccount {
  username: string
  password: string
}

async function main() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL ו-SUPABASE_SERVICE_KEY נדרשים לזריעת משתמשים')
  }
  const accounts = JSON.parse(readFileSync('./accounts.json', 'utf-8')) as SeedAccount[]
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

  for (const account of accounts) {
    const passwordHash = await hashPassword(account.password)
    const { error } = await client
      .from('users')
      .upsert({ username: account.username, password_hash: passwordHash }, { onConflict: 'username' })
    if (error) throw new Error(`seed failed for ${account.username}: ${error.message}`)
    console.log(`✓ ${account.username}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 4: Write the accounts example file**

`make-issues/server/accounts.example.json`:
```json
[
  { "username": "elad", "password": "change-me" }
]
```

- [ ] **Step 5: Write .env.example**

`make-issues/server/.env.example`:
```
# הגדרות שרת — העתק ל-.env ומלא ערכים אמיתיים. בפיתוח אפשר לרוץ בלי .env בכלל (נופל ל-DB בזיכרון).

PORT=8787
NODE_ENV=development

# חתימת ה-access token (JWT). בפרודקשן חובה ערך אקראי ארוך!
JWT_SECRET=dev-secret-change-me

# secret משותף עם Make.com — כל HTTP module ב-Error Handler שולח אותו ב-Authorization: Bearer <ערך>
WEBHOOK_SECRET=dev-webhook-secret-change-me

# Supabase — אם ריק, השרת נופל אוטומטית ל-DB בזיכרון (פיתוח בלבד, לא מתמיד בין הרצות)
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

- [ ] **Step 6: Typecheck and run the full server test suite**

Run: `npm run typecheck -w server && npm test -w server` (from `make-issues/`)
Expected: no type errors, all tests still pass.

- [ ] **Step 7: Start the dev server manually and hit /api/health**

Run: `npm run dev -w server` (from `make-issues/`, leave running)
Run in a second terminal: `curl http://localhost:8787/api/health`
Expected: `{"ok":true}`. Stop the dev server after confirming.

- [ ] **Step 8: Commit**

```bash
git add make-issues/server/src/app.ts make-issues/server/src/index.ts make-issues/server/src/seed.ts make-issues/server/accounts.example.json make-issues/server/.env.example
git commit -m "feat(make-issues): assemble Hono app, dev entrypoint, and account seed script"
```

---

### Task 9: Vercel deployment wiring

**Files:**
- Create: `make-issues/api-src/index.ts`
- Create: `make-issues/scripts/vercel-build.mjs`
- Create: `make-issues/vercel.json`

- [ ] **Step 1: Write the Vercel serverless entry point**

`make-issues/api-src/index.ts`:
```typescript
// Vercel serverless entry point — wraps the Hono app for deployment.
import { getRequestListener } from '@hono/node-server'
import { createApp } from '../server/src/app'
import { createDb } from '../server/src/db/db'
import { env } from '../server/src/env'

// SECURITY: not logging env values — only confirming keys exist for debugging
console.log('[boot] JWT_SECRET set:', env.JWT_SECRET !== 'dev-secret-change-me')

const db = createDb(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
const app = createApp({ db, env })

// Named export forces esbuild CJS wrapper to generate exports.default + module.exports = __toCommonJS(...)
// The vercel-build.mjs footer then sets module.exports = exports.default (the callable handler).
export const handler = getRequestListener(app.fetch)
export default handler
```

- [ ] **Step 2: Write the Vercel build script**

`make-issues/scripts/vercel-build.mjs`:
```javascript
import { build } from 'esbuild'
import { mkdir, cp, writeFile } from 'fs/promises'
import { execSync } from 'child_process'

// 1. Build the Vite frontend
execSync('npm run build -w client', { stdio: 'inherit' })

// 2. Create Vercel Build Output API structure
await mkdir('.vercel/output/static', { recursive: true })
await mkdir('.vercel/output/functions/api/index.func', { recursive: true })

// 3. Copy frontend static files
await cp('client/dist', '.vercel/output/static', { recursive: true })

// 4. Bundle API with esbuild → function output dir
await build({
  entryPoints: ['api-src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: '.vercel/output/functions/api/index.func/index.js',
  target: 'node20',
  footer: { js: 'if (typeof module.exports.default === "function") module.exports = module.exports.default;' },
})

// 5. Function manifest (required by Build Output API)
await writeFile(
  '.vercel/output/functions/api/index.func/.vc-config.json',
  JSON.stringify({
    runtime: 'nodejs20.x',
    handler: 'index.js',
    launcherType: 'Nodejs',
    shouldAddHelpers: false,
  })
)

// 6. Route config: /api/* → function, then static files, then SPA fallback
await writeFile(
  '.vercel/output/config.json',
  JSON.stringify({
    version: 3,
    routes: [
      { src: '/api/(.*)', dest: '/api/index' },
      { handle: 'filesystem' },
      { src: '/(.*)', dest: '/index.html' },
    ],
  })
)

console.log('Vercel build complete')
```

- [ ] **Step 3: Write vercel.json**

`make-issues/vercel.json`:
```json
{
  "buildCommand": "node scripts/vercel-build.mjs",
  "installCommand": "npm install"
}
```

- [ ] **Step 4: Commit**

```bash
git add make-issues/api-src make-issues/scripts make-issues/vercel.json
git commit -m "feat(make-issues): Vercel Build Output API deployment wiring"
```

Note: actually running this build requires the client to exist first (Task 10-14). It's exercised for real in Task 15.

---

### Task 10: Client scaffold

**Files:**
- Create: `make-issues/client/package.json`
- Create: `make-issues/client/tsconfig.json`
- Create: `make-issues/client/vite.config.ts`
- Create: `make-issues/client/index.html`
- Create: `make-issues/client/src/index.css`
- Create: `make-issues/client/src/main.tsx`
- Create: `make-issues/client/src/components/forms.tsx`
- Create: `make-issues/client/src/lib/api.ts`

- [ ] **Step 1: Create the client package.json**

`make-issues/client/package.json`:
```json
{
  "name": "@make-issues/client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@make-issues/shared": "*",
    "react": "^19.2.6",
    "react-dom": "^19.2.6"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "tailwindcss": "^4.3.0",
    "typescript": "~6.0.2",
    "vite": "^8.0.12",
    "vitest": "^4.1.8"
  }
}
```

- [ ] **Step 2: Create the client tsconfig**

`make-issues/client/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "types": ["vite/client"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create vite.config.ts**

`make-issues/client/vite.config.ts`:
```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // בפיתוח: Vite מגיש את הקליינט וכל /api עובר לשרת ה-Hono
    proxy: { '/api': 'http://localhost:8787' },
  },
  test: {
    globals: true,
  },
})
```

- [ ] **Step 4: Create index.html**

`make-issues/client/index.html`:
```html
<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>תקלות Make — RDP</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create index.css**

`make-issues/client/src/index.css`:
```css
@import "tailwindcss";

html, body, #root {
  height: 100%;
}

body {
  background-color: #0f172a;
  color: #e2e8f0;
}
```

- [ ] **Step 6: Create the shared form components**

`make-issues/client/src/components/forms.tsx`:
```tsx
import type { ReactNode } from 'react'

const inputClass =
  'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-emerald-500'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-400">{label}</span>
      {children}
    </label>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-40"
    />
  )
}
```

- [ ] **Step 7: Write the API fetch wrapper (with transparent access-token refresh on 401)**

`make-issues/client/src/lib/api.ts`:
```typescript
// עטיפת fetch — JSON אוטומטי, ריענון access token שקוף בכשל 401, אירוע ניתוק אם גם הריענון נכשל.
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const UNAUTHORIZED_EVENT = 'mi:unauthorized'

async function rawFetch(path: string, init?: RequestInit & { json?: unknown }): Promise<Response> {
  const { json, ...rest } = init ?? {}
  return fetch(path, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...rest.headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })
}

let refreshPromise: Promise<boolean> | null = null

function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = rawFetch('/api/auth/refresh', { method: 'POST' })
      .then((res) => res.ok)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

const NO_RETRY_PATHS = new Set(['/api/auth/login', '/api/auth/refresh'])

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  let res: Response
  try {
    res = await rawFetch(path, init)
  } catch {
    throw new ApiError(0, 'אין חיבור לשרת — בדוק את הרשת')
  }

  if (res.status === 401 && !NO_RETRY_PATHS.has(path)) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      try {
        res = await rawFetch(path, init)
      } catch {
        throw new ApiError(0, 'אין חיבור לשרת — בדוק את הרשת')
      }
    }
  }

  if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))

  if (!res.ok) {
    let message = 'שגיאה בשרת'
    try {
      const data = (await res.json()) as { error?: string }
      if (data?.error) message = data.error
    } catch {
      // הגוף אינו JSON — נשארים עם הודעת ברירת המחדל
    }
    throw new ApiError(res.status, message)
  }

  return (await res.json()) as T
}
```

- [ ] **Step 8: Create a placeholder main.tsx and App.tsx so the app builds (fleshed out in later tasks)**

`make-issues/client/src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`make-issues/client/src/App.tsx`:
```tsx
export default function App() {
  return <div className="p-4 text-slate-100">טוען…</div>
}
```

- [ ] **Step 9: Install client dependencies and verify it builds**

Run: `npm install --prefix make-issues` (re-run from repo root to pick up the new workspace)
Run: `npm run build -w client --prefix make-issues`
Expected: builds successfully into `make-issues/client/dist`.

- [ ] **Step 10: Commit**

```bash
git add make-issues/client/package.json make-issues/client/tsconfig.json make-issues/client/vite.config.ts make-issues/client/index.html make-issues/client/src/index.css make-issues/client/src/main.tsx make-issues/client/src/App.tsx make-issues/client/src/components/forms.tsx make-issues/client/src/lib/api.ts
git commit -m "feat(make-issues): client scaffold (Vite + React + Tailwind, RTL)"
```

---

### Task 11: Auth state + Login screen

**Files:**
- Create: `make-issues/client/src/state/useAuth.tsx`
- Create: `make-issues/client/src/screens/Login.tsx`
- Modify: `make-issues/client/src/main.tsx`

- [ ] **Step 1: Write the auth context**

`make-issues/client/src/state/useAuth.tsx`:
```tsx
// הקשר ההתחברות — בודק session בעלייה (GET /api/auth/me), מאזין ל-401 גלובלי.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Me } from '@make-issues/shared'
import { UNAUTHORIZED_EVENT, api } from '../lib/api'

interface AuthState {
  me: Me | null
  loading: boolean
  login: (me: Me) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  me: null,
  loading: true,
  login: () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<Me>('/api/auth/me')
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoading(false))

    const onUnauthorized = () => setMe(null)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setMe(null)
  }

  return (
    <AuthContext.Provider value={{ me, loading, login: setMe, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

- [ ] **Step 2: Write the Login screen**

`make-issues/client/src/screens/Login.tsx`:
```tsx
import { useState } from 'react'
import type { Me } from '@make-issues/shared'
import { Field, PrimaryButton, TextInput } from '../components/forms'
import { ApiError, api } from '../lib/api'
import { useAuth } from '../state/useAuth'

export function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const me = await api<Me>('/api/auth/login', { method: 'POST', json: { username, password } })
      login(me)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה — נסה שוב')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-8 text-center text-2xl font-bold text-slate-100">תקלות Make</h1>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Field label="שם משתמש">
          <TextInput autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="סיסמה">
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <PrimaryButton type="submit" disabled={busy || !username || !password}>
          {busy ? 'מתחבר…' : 'כניסה'}
        </PrimaryButton>
        {error && <p className="text-center text-sm text-rose-400">{error}</p>}
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Wire AuthProvider into main.tsx**

Modify `make-issues/client/src/main.tsx` — replace the whole file:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './state/useAuth'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
```

- [ ] **Step 4: Update App.tsx to show Login when logged out**

Modify `make-issues/client/src/App.tsx` — replace the whole file:
```tsx
import { useAuth } from './state/useAuth'
import { Login } from './screens/Login'

export default function App() {
  const { me, loading } = useAuth()

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">טוען…</div>
  }

  if (!me) return <Login />

  return <div className="p-4 text-slate-100">שלום, {me.username}</div>
}
```

- [ ] **Step 5: Typecheck**

Run: `npm run build -w client --prefix make-issues`
Expected: builds successfully (this also runs `tsc --noEmit`).

- [ ] **Step 6: Commit**

```bash
git add make-issues/client/src/state/useAuth.tsx make-issues/client/src/screens/Login.tsx make-issues/client/src/main.tsx make-issues/client/src/App.tsx
git commit -m "feat(make-issues): client auth state + login screen"
```

---

### Task 12: Issue display — pure logic + components

**Files:**
- Create: `make-issues/client/src/lib/issueBadge.ts`
- Create: `make-issues/client/src/lib/viewMode.ts`
- Create: `make-issues/client/src/state/useViewMode.ts`
- Create: `make-issues/client/src/components/IssueBadge.tsx`
- Create: `make-issues/client/src/components/ViewToggle.tsx`
- Create: `make-issues/client/src/components/IssueCard.tsx`
- Create: `make-issues/client/src/components/IssueGrid.tsx`
- Create: `make-issues/client/src/components/IssueTable.tsx`
- Create: `make-issues/client/src/components/IssueList.tsx`
- Test: `make-issues/client/src/lib/issueBadge.test.ts`
- Test: `make-issues/client/src/lib/viewMode.test.ts`

- [ ] **Step 1: Write the failing tests for the pure logic**

`make-issues/client/src/lib/issueBadge.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import type { IssueType } from '@make-issues/shared'
import { badgeColorForType } from './issueBadge'

describe('badgeColorForType', () => {
  it('מחזיר צבע שונה לכל אחד מ-4 סוגי התקלה', () => {
    const types: IssueType[] = [
      'עומדות להיגמר האופרציות',
      'נגמרו האופרציות',
      'תקלה בסנריו',
      'סנריו נפל',
    ]
    const colors = types.map(badgeColorForType)
    expect(new Set(colors).size).toBe(4)
  })

  it('נופל לצבע ברירת מחדל על ערך לא מוכר', () => {
    expect(badgeColorForType('לא קיים' as IssueType)).toBe('#64748b')
  })
})
```

`make-issues/client/src/lib/viewMode.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import { readViewMode, writeViewMode } from './viewMode'

function fakeStorage(initial: Record<string, string> = {}) {
  const store = { ...initial }
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
  }
}

describe('viewMode', () => {
  it('ברירת מחדל cards כשאין ערך שמור', () => {
    expect(readViewMode(fakeStorage())).toBe('cards')
  })

  it('קורא table אחרי כתיבה', () => {
    const storage = fakeStorage()
    writeViewMode(storage, 'table')
    expect(readViewMode(storage)).toBe('table')
  })

  it('ערך זר נופל ל-cards', () => {
    expect(readViewMode(fakeStorage({ 'mi:view-mode': 'bogus' }))).toBe('cards')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w client --prefix make-issues`
Expected: FAIL — `./issueBadge` and `./viewMode` don't exist yet.

- [ ] **Step 3: Implement the pure logic modules**

`make-issues/client/src/lib/issueBadge.ts`:
```typescript
import type { IssueType } from '@make-issues/shared'

const COLORS: Record<IssueType, string> = {
  'עומדות להיגמר האופרציות': '#d97706',
  'נגמרו האופרציות': '#ea580c',
  'תקלה בסנריו': '#dc2626',
  'סנריו נפל': '#991b1b',
}

export function badgeColorForType(type: IssueType): string {
  return COLORS[type] ?? '#64748b'
}
```

`make-issues/client/src/lib/viewMode.ts`:
```typescript
const STORAGE_KEY = 'mi:view-mode'
export type ViewMode = 'cards' | 'table'

export function readViewMode(storage: Pick<Storage, 'getItem'>): ViewMode {
  const value = storage.getItem(STORAGE_KEY)
  return value === 'table' ? 'table' : 'cards'
}

export function writeViewMode(storage: Pick<Storage, 'setItem'>, mode: ViewMode): void {
  storage.setItem(STORAGE_KEY, mode)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -w client --prefix make-issues`
Expected: PASS.

- [ ] **Step 5: Write the useViewMode hook**

`make-issues/client/src/state/useViewMode.ts`:
```typescript
import { useState } from 'react'
import { readViewMode, writeViewMode, type ViewMode } from '../lib/viewMode'

export function useViewMode() {
  const [mode, setModeState] = useState<ViewMode>(() => readViewMode(localStorage))

  const setMode = (next: ViewMode) => {
    writeViewMode(localStorage, next)
    setModeState(next)
  }

  return [mode, setMode] as const
}
```

- [ ] **Step 6: Write the display components**

`make-issues/client/src/components/IssueBadge.tsx`:
```tsx
import type { IssueType } from '@make-issues/shared'
import { badgeColorForType } from '../lib/issueBadge'

export function IssueBadge({ type }: { type: IssueType }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: badgeColorForType(type) }}
    >
      {type}
    </span>
  )
}
```

`make-issues/client/src/components/ViewToggle.tsx`:
```tsx
import type { ViewMode } from '../lib/viewMode'

export function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-700 p-0.5">
      <button
        type="button"
        onClick={() => onChange('cards')}
        className={`rounded-md px-3 py-1 text-sm ${mode === 'cards' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
      >
        כרטיסים
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        className={`rounded-md px-3 py-1 text-sm ${mode === 'table' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
      >
        טבלה
      </button>
    </div>
  )
}
```

`make-issues/client/src/components/IssueCard.tsx`:
```tsx
import type { Issue } from '@make-issues/shared'
import { IssueBadge } from './IssueBadge'

interface Props {
  issue: Issue
  onResolve?: (status: 'handled' | 'ignored') => void
}

export function IssueCard({ issue, onResolve }: Props) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-slate-100">{issue.clientName}</strong>
        <IssueBadge type={issue.issueType} />
      </div>
      <div className="mt-1 text-sm text-slate-400">סנריו: {issue.scenarioName}</div>
      <p className="mt-2 text-sm text-slate-200">{issue.description}</p>
      <div className="mt-2 flex gap-3 text-xs">
        <a className="text-sky-400 hover:underline" href={issue.scenarioLink} target="_blank" rel="noreferrer">
          🔗 סנריו
        </a>
        <a className="text-sky-400 hover:underline" href={issue.runLink} target="_blank" rel="noreferrer">
          🔗 ריצה ספציפית
        </a>
      </div>
      <div className="mt-2 text-xs text-slate-500">
        {onResolve
          ? new Date(issue.createdAt).toLocaleString('he-IL')
          : `טופל ע"י ${issue.resolvedBy} · ${issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleString('he-IL') : ''}`}
      </div>
      {onResolve && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onResolve('handled')}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
          >
            ✔ טופל
          </button>
          <button
            type="button"
            onClick={() => onResolve('ignored')}
            className="rounded-lg bg-slate-600 px-3 py-1.5 text-sm text-white hover:bg-slate-500"
          >
            ✕ להתעלם
          </button>
        </div>
      )}
    </div>
  )
}
```

`make-issues/client/src/components/IssueGrid.tsx`:
```tsx
import type { Issue } from '@make-issues/shared'
import { IssueCard } from './IssueCard'

interface Props {
  issues: Issue[]
  onResolve?: (id: string, status: 'handled' | 'ignored') => void
}

export function IssueGrid({ issues, onResolve }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {issues.map((issue) => (
        <IssueCard
          key={issue.id}
          issue={issue}
          onResolve={onResolve ? (status) => onResolve(issue.id, status) : undefined}
        />
      ))}
    </div>
  )
}
```

`make-issues/client/src/components/IssueTable.tsx`:
```tsx
import type { Issue } from '@make-issues/shared'
import { IssueBadge } from './IssueBadge'

interface Props {
  issues: Issue[]
  onResolve?: (id: string, status: 'handled' | 'ignored') => void
}

export function IssueTable({ issues, onResolve }: Props) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-slate-700 text-right text-slate-400">
          <th className="p-2">לקוח</th>
          <th className="p-2">סנריו</th>
          <th className="p-2">סוג</th>
          <th className="p-2">תיאור</th>
          <th className="p-2">קישורים</th>
          <th className="p-2">{onResolve ? 'פעולה' : 'טופל'}</th>
        </tr>
      </thead>
      <tbody>
        {issues.map((issue) => (
          <tr key={issue.id} className="border-b border-slate-800">
            <td className="p-2">{issue.clientName}</td>
            <td className="p-2">{issue.scenarioName}</td>
            <td className="p-2">
              <IssueBadge type={issue.issueType} />
            </td>
            <td className="p-2">{issue.description}</td>
            <td className="p-2">
              <a className="text-sky-400 hover:underline" href={issue.scenarioLink} target="_blank" rel="noreferrer">
                סנריו
              </a>{' '}
              /{' '}
              <a className="text-sky-400 hover:underline" href={issue.runLink} target="_blank" rel="noreferrer">
                ריצה
              </a>
            </td>
            {onResolve ? (
              <td className="p-2">
                <button
                  type="button"
                  onClick={() => onResolve(issue.id, 'handled')}
                  className="mx-1 rounded bg-emerald-600 px-2 py-1 text-white"
                >
                  ✔
                </button>
                <button
                  type="button"
                  onClick={() => onResolve(issue.id, 'ignored')}
                  className="mx-1 rounded bg-slate-600 px-2 py-1 text-white"
                >
                  ✕
                </button>
              </td>
            ) : (
              <td className="p-2 text-slate-500">{issue.resolvedBy}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

`make-issues/client/src/components/IssueList.tsx`:
```tsx
import type { Issue } from '@make-issues/shared'
import type { ViewMode } from '../lib/viewMode'
import { IssueGrid } from './IssueGrid'
import { IssueTable } from './IssueTable'

interface Props {
  issues: Issue[]
  mode: ViewMode
  onResolve?: (id: string, status: 'handled' | 'ignored') => void
}

export function IssueList({ issues, mode, onResolve }: Props) {
  if (issues.length === 0) {
    return <p className="py-8 text-center text-slate-500">אין תקלות להצגה</p>
  }
  return mode === 'cards' ? (
    <IssueGrid issues={issues} onResolve={onResolve} />
  ) : (
    <IssueTable issues={issues} onResolve={onResolve} />
  )
}
```

- [ ] **Step 7: Typecheck**

Run: `npm run build -w client --prefix make-issues`
Expected: builds successfully.

- [ ] **Step 8: Commit**

```bash
git add make-issues/client/src/lib/issueBadge.ts make-issues/client/src/lib/issueBadge.test.ts make-issues/client/src/lib/viewMode.ts make-issues/client/src/lib/viewMode.test.ts make-issues/client/src/state/useViewMode.ts make-issues/client/src/components/IssueBadge.tsx make-issues/client/src/components/ViewToggle.tsx make-issues/client/src/components/IssueCard.tsx make-issues/client/src/components/IssueGrid.tsx make-issues/client/src/components/IssueTable.tsx make-issues/client/src/components/IssueList.tsx
git commit -m "feat(make-issues): issue badge/card/table/grid components with cards-table toggle"
```

---

### Task 13: Open issues screen

**Files:**
- Create: `make-issues/client/src/state/useIssues.ts`
- Create: `make-issues/client/src/screens/OpenIssues.tsx`

- [ ] **Step 1: Write the useIssues hook**

`make-issues/client/src/state/useIssues.ts`:
```typescript
// שולף תקלות לפי סטטוס, מרענן כל 15 שניות, ותומך בעדכון סטטוס אופטימי.
import { useCallback, useEffect, useState } from 'react'
import type { Issue, IssueStatus } from '@make-issues/shared'
import { api } from '../lib/api'

const POLL_MS = 15000

export function useIssues(statuses: IssueStatus[]) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const statusParam = statuses.join(',')

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ issues: Issue[] }>(`/api/issues?status=${statusParam}`)
      setIssues(res.issues)
    } catch {
      // שגיאת רשת — נשארים עם הנתונים הקיימים, מנסים שוב ברענון הבא
    } finally {
      setLoading(false)
    }
  }, [statusParam])

  useEffect(() => {
    void refresh()
    const id = setInterval(() => void refresh(), POLL_MS)
    return () => clearInterval(id)
  }, [refresh])

  const resolve = async (id: string, status: 'handled' | 'ignored') => {
    const previous = issues
    setIssues((current) => current.filter((issue) => issue.id !== id))
    try {
      await api(`/api/issues/${id}`, { method: 'PATCH', json: { status } })
    } catch {
      setIssues(previous)
    }
  }

  return { issues, loading, resolve, refresh }
}
```

- [ ] **Step 2: Write the OpenIssues screen**

`make-issues/client/src/screens/OpenIssues.tsx`:
```tsx
import { IssueList } from '../components/IssueList'
import { ViewToggle } from '../components/ViewToggle'
import { useIssues } from '../state/useIssues'
import { useViewMode } from '../state/useViewMode'

export function OpenIssues() {
  const { issues, loading, resolve } = useIssues(['open'])
  const [mode, setMode] = useViewMode()

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">תקלות פתוחות ({issues.length})</h2>
        <ViewToggle mode={mode} onChange={setMode} />
      </div>
      {loading ? (
        <p className="text-slate-500">טוען…</p>
      ) : (
        <IssueList issues={issues} mode={mode} onResolve={resolve} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run build -w client --prefix make-issues`
Expected: builds successfully.

- [ ] **Step 4: Commit**

```bash
git add make-issues/client/src/state/useIssues.ts make-issues/client/src/screens/OpenIssues.tsx
git commit -m "feat(make-issues): open issues screen with 15s polling and optimistic resolve"
```

---

### Task 14: History screen + top nav + App wiring

**Files:**
- Create: `make-issues/client/src/screens/History.tsx`
- Create: `make-issues/client/src/components/TopNav.tsx`
- Modify: `make-issues/client/src/App.tsx`

- [ ] **Step 1: Write the History screen**

`make-issues/client/src/screens/History.tsx`:
```tsx
import { IssueList } from '../components/IssueList'
import { ViewToggle } from '../components/ViewToggle'
import { useIssues } from '../state/useIssues'
import { useViewMode } from '../state/useViewMode'

export function History() {
  const { issues, loading } = useIssues(['handled', 'ignored'])
  const [mode, setMode] = useViewMode()

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">היסטוריה</h2>
        <ViewToggle mode={mode} onChange={setMode} />
      </div>
      {loading ? <p className="text-slate-500">טוען…</p> : <IssueList issues={issues} mode={mode} />}
    </div>
  )
}
```

- [ ] **Step 2: Write the top nav**

`make-issues/client/src/components/TopNav.tsx`:
```tsx
import { useAuth } from '../state/useAuth'

export type Tab = 'open' | 'history'

export function TopNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const { logout } = useAuth()

  return (
    <nav className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange('open')}
          className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'open' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
        >
          פתוחות
        </button>
        <button
          type="button"
          onClick={() => onChange('history')}
          className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'history' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
        >
          היסטוריה
        </button>
      </div>
      <button type="button" onClick={() => void logout()} className="text-sm text-slate-500 hover:text-slate-300">
        התנתקות
      </button>
    </nav>
  )
}
```

- [ ] **Step 3: Wire everything into App.tsx**

Modify `make-issues/client/src/App.tsx` — replace the whole file:
```tsx
import { useState } from 'react'
import { TopNav, type Tab } from './components/TopNav'
import { Login } from './screens/Login'
import { OpenIssues } from './screens/OpenIssues'
import { History } from './screens/History'
import { useAuth } from './state/useAuth'

export default function App() {
  const { me, loading } = useAuth()
  const [tab, setTab] = useState<Tab>('open')

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">טוען…</div>
  }

  if (!me) return <Login />

  return (
    <div className="min-h-screen bg-slate-900">
      <TopNav tab={tab} onChange={setTab} />
      {tab === 'open' ? <OpenIssues /> : <History />}
    </div>
  )
}
```

- [ ] **Step 4: Run the full test suite and build**

Run: `npm test --prefix make-issues && npm run build -w client --prefix make-issues`
Expected: all server + client tests pass, client builds cleanly.

- [ ] **Step 5: Commit**

```bash
git add make-issues/client/src/screens/History.tsx make-issues/client/src/components/TopNav.tsx make-issues/client/src/App.tsx
git commit -m "feat(make-issues): history screen, top nav, and full app wiring"
```

---

### Task 15: Manual E2E verification

No new files — this task verifies the whole system end to end using the dev servers, and documents the Supabase setup steps the user still needs to do manually.

- [ ] **Step 1: Set up a local .env pointing at a real (or freshly created) Supabase project**

Copy `make-issues/server/.env.example` to `make-issues/server/.env`, fill in `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and set `JWT_SECRET` / `WEBHOOK_SECRET` to random values (e.g. `openssl rand -hex 32`). Run the SQL in `make-issues/server/supabase-schema.sql` against that project (Supabase SQL Editor).

- [ ] **Step 2: Seed a test account**

Copy `make-issues/server/accounts.example.json` to `make-issues/server/accounts.json`, edit the username/password, then run:

Run: `npm run seed -w server --prefix make-issues`
Expected: `✓ <username>` printed.

- [ ] **Step 3: Start both dev servers**

Run: `npm run dev --prefix make-issues`
Expected: server on `:8787`, client on Vite's default port (proxying `/api` to the server).

- [ ] **Step 4: Simulate a Make.com webhook call**

Run (replace `<WEBHOOK_SECRET>` with the value from `.env`):
```bash
curl -X POST http://localhost:8787/api/webhook/issues \
  -H "Authorization: Bearer <WEBHOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"clientName":"פיק אנד פאק","scenarioName":"סנכרון הזמנות","description":"בדיקה ידנית","issueType":"סנריו נפל","scenarioLink":"https://www.make.com/en/scenario/1","runLink":"https://www.make.com/en/scenario/1/run/2"}'
```
Expected: `{"ok":true,"id":"<uuid>"}`.

- [ ] **Step 5: Verify in the browser**

Open the client URL, log in with the seeded account, confirm the simulated issue appears on "פתוחות" within 15 seconds (or immediately on load). Toggle כרטיסים/טבלה and confirm both views show the same issue. Click "✔ טופל" and confirm it disappears from "פתוחות" and appears in "היסטוריה" with the logged-in username as `resolvedBy`.

- [ ] **Step 6: Verify session refresh**

In the browser devtools, delete the `mi_access` cookie only (keep `mi_refresh`), then trigger any API call (e.g. switch tabs). Confirm the app stays logged in (the 401→refresh→retry path in `lib/api.ts` kicks in) instead of bouncing to the login screen.

- [ ] **Step 7: Note remaining manual setup for the user**

Document (in the chat, not in code) that before this goes live the user still needs to: (a) add an HTTP module to each Make.com scenario's Error Handler pointing at the deployed `/api/webhook/issues` URL with the `WEBHOOK_SECRET` header, (b) create the real Vercel project + Supabase project + set env vars there, (c) seed the 3-4 real team accounts.

---

## Self-Review Notes

- **Spec coverage:** webhook ingestion (Task 5), fixed 4-value issue type + free-text description (shared types + Task 5 validation), open/handled/ignored status model (shared types, Task 7), history screen (Task 14), cards⇄table toggle persisted across screens (Task 12 `useViewMode` + `localStorage`, used identically in Tasks 13 & 14), 15s auto-refresh (Task 13 `useIssues`), username/password auth with short-lived access + rotating refresh token (Tasks 3, 6), DB-backed login rate limiting (Task 4), Vercel deploy (Task 9), manual password reset caveat (documented in spec, operational — no code needed) — all covered.
- **Type consistency:** `IssueStatus`/`IssueType`/`Issue`/`WebhookIssueInput`/`Me` defined once in `shared/src/types.ts` (Task 1) and imported everywhere else — no re-declaration drift. `AppDB` interface (Task 2) is the single contract both `memory-impl.ts` and `supabase-impl.ts` satisfy; route handlers only ever call through it.
- **No placeholders:** every step above has complete, runnable code — confirmed by re-reading each task.
