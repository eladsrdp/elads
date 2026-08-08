# WhatsApp Inbox Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture every message (text and voice, no reply logic) sent to/from the user's WhatsApp "Message Yourself" chat into a queryable SQLite store, via a new `inbox` service that receives webhooks from the already-running WAHA instance.

**Architecture:** A small Hono + TypeScript service (`inbox/`), matching the conventions already used in `priority-lite/server` and `hachamama-parenting-program/server`, exposes one route (`POST /webhook`). It filters WAHA's webhook events down to the one dedicated chat, classifies each message as text/voice/other, and writes it to a local SQLite file via `better-sqlite3`. It runs as a second Docker container alongside `waha`, on the Docker-internal network only — no public port.

**Tech Stack:** Node.js, TypeScript, Hono, `@hono/node-server`, `better-sqlite3`, `zod`, `tsx`, Vitest, Docker Compose.

**Reference spec:** `docs/superpowers/specs/2026-08-09-whatsapp-inbox-capture-design.md`

---

## Task 1: Project scaffold

**Files:**
- Create: `inbox/package.json`
- Create: `inbox/tsconfig.json`
- Create: `inbox/.gitignore`

- [ ] **Step 1: Create `inbox/package.json`**

```json
{
  "name": "@waha/inbox",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch --import tsx src/index.ts",
    "start": "tsx src/index.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.7",
    "better-sqlite3": "^11.8.1",
    "dotenv": "^16.4.7",
    "hono": "^4.6.14",
    "tsx": "^4.19.2",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/node": "^24.12.3",
    "typescript": "~6.0.2",
    "vitest": "^4.1.8"
  }
}
```

- [ ] **Step 2: Create `inbox/tsconfig.json`**

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
  "include": ["src"]
}
```

- [ ] **Step 3: Create `inbox/.gitignore`**

```
node_modules
data
.env
```

- [ ] **Step 4: Install dependencies**

Run: `cd inbox && npm install`
Expected: `node_modules` created, `package-lock.json` written, no errors (may show a native-build step for `better-sqlite3` — that's expected).

- [ ] **Step 5: Commit**

```bash
git add inbox/package.json inbox/package-lock.json inbox/tsconfig.json inbox/.gitignore
git commit -m "chore(inbox): scaffold inbox service project"
```

---

## Task 2: Storage layer (`db.ts`) — TDD

**Files:**
- Create: `inbox/src/db.ts`
- Test: `inbox/src/db.test.ts`

- [ ] **Step 1: Write the failing test**

Create `inbox/src/db.test.ts`:

```typescript
// inbox/src/db.test.ts
import { describe, expect, it } from 'vitest'
import { createDb } from './db'

describe('createDb', () => {
  it('שומר הודעה חדשה ומחזיר true', () => {
    const db = createDb(':memory:')
    const inserted = db.insertMessage({
      wahaMessageId: 'msg-1',
      direction: 'incoming',
      type: 'text',
      body: 'שלום',
      timestamp: 1700000000,
      rawJson: '{}',
    })
    expect(inserted).toBe(true)
    expect(db.countMessages()).toBe(1)
  })

  it('מתעלם מהודעה כפולה עם אותו waha_message_id ומחזיר false', () => {
    const db = createDb(':memory:')
    db.insertMessage({
      wahaMessageId: 'msg-1',
      direction: 'incoming',
      type: 'text',
      body: 'שלום',
      timestamp: 1700000000,
      rawJson: '{}',
    })
    const secondInsert = db.insertMessage({
      wahaMessageId: 'msg-1',
      direction: 'incoming',
      type: 'text',
      body: 'שלום שוב',
      timestamp: 1700000001,
      rawJson: '{}',
    })
    expect(secondInsert).toBe(false)
    expect(db.countMessages()).toBe(1)
  })

  it('שומר הודעה קולית עם body=NULL', () => {
    const db = createDb(':memory:')
    const inserted = db.insertMessage({
      wahaMessageId: 'msg-2',
      direction: 'incoming',
      type: 'voice',
      body: null,
      timestamp: 1700000000,
      rawJson: '{}',
    })
    expect(inserted).toBe(true)
    expect(db.countMessages()).toBe(1)
  })

  it('שומר הודעות יוצאות ונכנסות גם יחד', () => {
    const db = createDb(':memory:')
    db.insertMessage({
      wahaMessageId: 'msg-in',
      direction: 'incoming',
      type: 'text',
      body: 'נכנס',
      timestamp: 1700000000,
      rawJson: '{}',
    })
    db.insertMessage({
      wahaMessageId: 'msg-out',
      direction: 'outgoing',
      type: 'text',
      body: 'יוצא',
      timestamp: 1700000001,
      rawJson: '{}',
    })
    expect(db.countMessages()).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd inbox && npx vitest run src/db.test.ts`
Expected: FAIL — `Cannot find module './db'` (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `inbox/src/db.ts`:

```typescript
// inbox/src/db.ts
// שכבת האחסון — SQLite מקומי. path=':memory:' לבדיקות.
import Database from 'better-sqlite3'

export type MessageDirection = 'incoming' | 'outgoing'
export type MessageType = 'text' | 'voice' | 'other'

export interface MessageRow {
  wahaMessageId: string
  direction: MessageDirection
  type: MessageType
  body: string | null
  timestamp: number
  rawJson: string
}

export interface Db {
  /** true אם נכתבה שורה חדשה, false אם התעלם מכפילות (waha_message_id קיים) */
  insertMessage(row: MessageRow): boolean
  countMessages(): number
}

export function createDb(path: string): Db {
  const conn = new Database(path)
  conn.pragma('journal_mode = WAL')
  conn.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      waha_message_id TEXT NOT NULL UNIQUE,
      direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
      type TEXT NOT NULL CHECK (type IN ('text', 'voice', 'other')),
      body TEXT,
      timestamp INTEGER NOT NULL,
      raw_json TEXT NOT NULL,
      received_at INTEGER NOT NULL
    )
  `)

  const insertStmt = conn.prepare(`
    INSERT OR IGNORE INTO messages
      (waha_message_id, direction, type, body, timestamp, raw_json, received_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const countStmt = conn.prepare('SELECT COUNT(*) as count FROM messages')

  return {
    insertMessage(row) {
      const result = insertStmt.run(
        row.wahaMessageId,
        row.direction,
        row.type,
        row.body,
        row.timestamp,
        row.rawJson,
        Date.now(),
      )
      return result.changes > 0
    },
    countMessages() {
      const result = countStmt.get() as { count: number }
      return result.count
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd inbox && npx vitest run src/db.test.ts`
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Typecheck**

Run: `cd inbox && npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add inbox/src/db.ts inbox/src/db.test.ts
git commit -m "feat(inbox): add SQLite storage layer with dedup on waha_message_id"
```

---

## Task 3: Webhook route (`app.ts`) — TDD

**Files:**
- Create: `inbox/src/app.ts`
- Test: `inbox/src/app.test.ts`

- [ ] **Step 1: Write the failing test**

Create `inbox/src/app.test.ts`:

```typescript
// inbox/src/app.test.ts
import { describe, expect, it } from 'vitest'
import { createApp } from './app'
import { createDb } from './db'

const SELF_CHAT_ID = '972542438624@c.us'

function buildApp() {
  const db = createDb(':memory:')
  const app = createApp({ db, selfChatId: SELF_CHAT_ID })
  return { app, db }
}

function textMessagePayload(overrides: Record<string, unknown> = {}) {
  return {
    event: 'message',
    session: 'default',
    payload: {
      id: 'msg-1',
      timestamp: 1700000000,
      from: SELF_CHAT_ID,
      to: SELF_CHAT_ID,
      fromMe: false,
      body: 'שלום',
      type: 'chat',
      ...overrides,
    },
  }
}

function postWebhook(app: ReturnType<typeof createApp>, body: unknown) {
  return app.request('/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /webhook', () => {
  it('שומר הודעת טקסט מהצ׳אט הייעודי', async () => {
    const { app, db } = buildApp()
    const res = await postWebhook(app, textMessagePayload())
    expect(res.status).toBe(200)
    expect(db.countMessages()).toBe(1)
  })

  it('מתעלם מהודעה מצ׳אט אחר, עדיין מחזיר 200', async () => {
    const { app, db } = buildApp()
    const res = await postWebhook(
      app,
      textMessagePayload({ from: 'someone-else@c.us', to: 'someone-else@c.us' }),
    )
    expect(res.status).toBe(200)
    expect(db.countMessages()).toBe(0)
  })

  it('מתעלם מאירוע שאינו message, עדיין מחזיר 200', async () => {
    const { app, db } = buildApp()
    const res = await postWebhook(app, { event: 'state.change', payload: {} })
    expect(res.status).toBe(200)
    expect(db.countMessages()).toBe(0)
  })

  it('שומר הודעה קולית עם body=NULL', async () => {
    const { app, db } = buildApp()
    const res = await postWebhook(
      app,
      textMessagePayload({ id: 'msg-voice', type: 'ptt', body: undefined }),
    )
    expect(res.status).toBe(200)
    expect(db.countMessages()).toBe(1)
  })

  it('אותו waha_message_id פעמיים — נשארת שורה אחת', async () => {
    const { app, db } = buildApp()
    const payload = textMessagePayload()
    await postWebhook(app, payload)
    await postWebhook(app, payload)
    expect(db.countMessages()).toBe(1)
  })

  it('פיילוד לא תקין (JSON שגוי) לא קורס, מחזיר 200', async () => {
    const { app, db } = buildApp()
    const res = await app.request('/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not valid json',
    })
    expect(res.status).toBe(200)
    expect(db.countMessages()).toBe(0)
  })

  it('הודעה יוצאת (fromMe=true) נשמרת עם direction=outgoing', async () => {
    const { app, db } = buildApp()
    const res = await postWebhook(
      app,
      textMessagePayload({ id: 'msg-out', fromMe: true }),
    )
    expect(res.status).toBe(200)
    expect(db.countMessages()).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd inbox && npx vitest run src/app.test.ts`
Expected: FAIL — `Cannot find module './app'` (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `inbox/src/app.ts`:

```typescript
// inbox/src/app.ts
// הרכבת אפליקציית ה-Hono — מופרד מ-index.ts כדי שבדיקות יוכלו להרכיב app עם db משלהן.
import { Hono } from 'hono'
import type { Db, MessageType } from './db'

interface WahaWebhookPayload {
  event?: string
  payload?: {
    id?: string
    timestamp?: number
    from?: string
    to?: string
    fromMe?: boolean
    body?: string
    type?: string
  }
}

function toMessageType(wahaType: string | undefined): MessageType {
  if (wahaType === 'chat') return 'text'
  if (wahaType === 'ptt') return 'voice'
  return 'other'
}

export interface AppContext {
  db: Db
  selfChatId: string
}

export function createApp(ctx: AppContext) {
  const app = new Hono()

  app.get('/health', (c) => c.json({ ok: true }))

  app.post('/webhook', async (c) => {
    let body: WahaWebhookPayload
    try {
      body = await c.req.json()
    } catch {
      console.error('[inbox] webhook payload is not valid JSON')
      return c.json({ ok: true, skipped: 'invalid json' }, 200)
    }

    const payload = body.payload
    if (body.event !== 'message' || !payload?.id) {
      return c.json({ ok: true, skipped: 'not a message event' }, 200)
    }

    // בצ'אט לעצמי from/to שווים, אבל בכללי: chat id הוא from כשההודעה נכנסת, to כשהיא יוצאת.
    const chatId = payload.fromMe ? payload.to : payload.from
    if (chatId !== ctx.selfChatId) {
      return c.json({ ok: true, skipped: 'chat not tracked' }, 200)
    }

    const type = toMessageType(payload.type)

    try {
      const inserted = ctx.db.insertMessage({
        wahaMessageId: payload.id,
        direction: payload.fromMe ? 'outgoing' : 'incoming',
        type,
        body: type === 'text' ? (payload.body ?? null) : null,
        timestamp: payload.timestamp ?? Math.floor(Date.now() / 1000),
        rawJson: JSON.stringify(body),
      })
      return c.json({ ok: true, inserted }, 200)
    } catch (err) {
      console.error('[inbox] failed to write message', err)
      return c.json({ ok: false }, 500)
    }
  })

  return app
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd inbox && npx vitest run src/app.test.ts`
Expected: PASS — 7 tests passing.

- [ ] **Step 5: Typecheck**

Run: `cd inbox && npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add inbox/src/app.ts inbox/src/app.test.ts
git commit -m "feat(inbox): add webhook route that filters and classifies WAHA messages"
```

---

## Task 4: Environment config and entrypoint

**Files:**
- Create: `inbox/src/env.ts`
- Create: `inbox/src/index.ts`
- Create: `inbox/.env.example`

- [ ] **Step 1: Create `inbox/src/env.ts`**

```typescript
// inbox/src/env.ts
// קונפיגורציית סביבה — נטענת פעם אחת ומאומתת עם zod.
import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().default(8080),
  SELF_CHAT_ID: z.string(),
  DB_PATH: z.string().default('./data/inbox.db'),
})

export type Env = z.infer<typeof schema>
export const env: Env = schema.parse(process.env)
```

- [ ] **Step 2: Create `inbox/src/index.ts`**

```typescript
// inbox/src/index.ts
// נקודת הכניסה — מרכיב תלויות אמיתיות לפי ה-env ומרים את השרת.
import { serve } from '@hono/node-server'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createApp } from './app'
import { createDb } from './db'
import { env } from './env'

mkdirSync(dirname(env.DB_PATH), { recursive: true })
const db = createDb(env.DB_PATH)
const app = createApp({ db, selfChatId: env.SELF_CHAT_ID })

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`📥 inbox — http://localhost:${info.port} (self chat: ${env.SELF_CHAT_ID})`)
})
```

- [ ] **Step 3: Create `inbox/.env.example`**

```
# Copy to .env and fill in the value
# SECURITY: never commit .env — it's git-ignored

# The WhatsApp chat id to capture (the "Message Yourself" chat) — see waha/docker-compose.yml
SELF_CHAT_ID=
```

- [ ] **Step 4: Typecheck**

Run: `cd inbox && npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Manual smoke test**

Run: `cd inbox && SELF_CHAT_ID=972542438624@c.us DB_PATH=./data/inbox.db npm run start`
Expected: prints `📥 inbox — http://localhost:8080 (self chat: 972542438624@c.us)` and stays running. Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add inbox/src/env.ts inbox/src/index.ts inbox/.env.example
git commit -m "feat(inbox): add env config and server entrypoint"
```

---

## Task 5: Dockerize and wire into `docker-compose.yml`

**Files:**
- Create: `inbox/Dockerfile`
- Create: `inbox/.dockerignore`
- Modify: `waha/docker-compose.yml`

- [ ] **Step 1: Create `inbox/Dockerfile`**

```dockerfile
FROM node:20-alpine
# better-sqlite3 is a native module — needs build tools; sqlite CLI for manual inspection
RUN apk add --no-cache python3 make g++ sqlite
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]
```

- [ ] **Step 2: Create `inbox/.dockerignore`**

```
node_modules
data
.env
```

- [ ] **Step 3: Modify `waha/docker-compose.yml`**

Replace the full file contents with:

```yaml
services:
  waha:
    image: devlikeapro/waha
    restart: unless-stopped
    ports:
      # SECURITY: bound to localhost only — access via SSH tunnel, not public internet
      - "127.0.0.1:3000:3000"
    env_file:
      - .env
    environment:
      WHATSAPP_DEFAULT_ENGINE: NOWEB
      WHATSAPP_API_KEY: ${WHATSAPP_API_KEY}
      WHATSAPP_HOOK_URL: ${WHATSAPP_HOOK_URL:-http://inbox:8080/webhook}
      WHATSAPP_HOOK_EVENTS: message
    volumes:
      - waha_sessions:/app/.sessions

  inbox:
    build: ../inbox
    restart: unless-stopped
    env_file:
      - .env
    environment:
      SELF_CHAT_ID: ${SELF_CHAT_ID}
    volumes:
      - inbox_data:/app/data

volumes:
  waha_sessions:
  inbox_data:
```

- [ ] **Step 4: Commit**

```bash
git add inbox/Dockerfile inbox/.dockerignore waha/docker-compose.yml
git commit -m "feat(inbox): add Dockerfile and wire inbox service into waha docker-compose"
```

---

## Task 6: Deploy to the Hetzner server

**Context:** The server (`188.245.198.72`) already runs WAHA (see [[whatsapp-personal-agent]] vault topic). SSH key-based access is already set up (no password). `waha/docker-compose.yml` and `.env` currently live at `/root/waha/` on the server; this task adds `/root/inbox/` alongside it, matching the `build: ../inbox` relative path in the compose file.

**Files:** None (remote deployment only — no repo changes in this task).

- [ ] **Step 1: Copy the `inbox` source to the server**

Run:
```bash
scp -r "inbox" root@188.245.198.72:/root/inbox
```
Expected: file listing scrolls by, no errors. This copies `node_modules` too, which is wasteful but harmless — `npm ci` isn't strictly required afterward, but run it anyway on the server to be safe since the local `node_modules` was built for Windows, not Linux (native `better-sqlite3` bindings won't match):

Run:
```bash
ssh root@188.245.198.72 "rm -rf /root/inbox/node_modules"
```
Expected: no output, exits 0. (The Docker build installs deps fresh inside the Linux container — the host copy doesn't need `node_modules` at all.)

- [ ] **Step 2: Copy the updated `docker-compose.yml`**

Run:
```bash
scp "waha/docker-compose.yml" root@188.245.198.72:/root/waha/docker-compose.yml
```
Expected: file transferred, no errors.

- [ ] **Step 3: Add `SELF_CHAT_ID` to the server's `.env`**

Run:
```bash
ssh root@188.245.198.72 "grep -q '^SELF_CHAT_ID=' /root/waha/.env || echo 'SELF_CHAT_ID=972542438624@c.us' >> /root/waha/.env"
```
Expected: no output (idempotent — safe to re-run), exits 0.

- [ ] **Step 4: Build and start**

Run:
```bash
ssh root@188.245.198.72 "cd /root/waha && docker compose up -d --build 2>&1 | tail -20"
```
Expected: `inbox` image builds (several minutes first time — native module compile), both `waha-waha-1` and `waha-inbox-1` end up `Started`.

- [ ] **Step 5: Verify the inbox service is healthy**

Run:
```bash
ssh root@188.245.198.72 "docker ps --filter name=waha- && docker logs waha-inbox-1 --tail 10"
```
Expected: both containers show `Up`, logs show `📥 inbox — http://localhost:8080 (self chat: 972542438624@c.us)` with no errors.

- [ ] **Step 6: Send a real test message and verify it was captured**

Run (uses the existing WAHA send capability from phase 1 — sends a message to the self-chat):
```bash
API_KEY=$(cat "waha/.api_key.local")
ssh root@188.245.198.72 "curl -s -X POST http://127.0.0.1:3000/api/sendText -H 'X-Api-Key: $API_KEY' -H 'Content-Type: application/json' -d '{\"session\":\"default\",\"chatId\":\"972542438624@c.us\",\"text\":\"בדיקת קליטה — inbox\"}'"
```
Then wait ~2 seconds and check the database:
```bash
ssh root@188.245.198.72 "sleep 2 && docker exec waha-inbox-1 sqlite3 /app/data/inbox.db 'SELECT id, direction, type, body FROM messages ORDER BY id DESC LIMIT 5;'"
```
Expected: a row appears with `direction=outgoing`, `type=text`, `body=בדיקת קליטה — inbox` (the message we just sent is itself captured, since WAHA fires the webhook for outgoing messages too).

- [ ] **Step 7: Update the vault**

Add a new dated session log entry to `vault/Meeting Notes/whatsapp-personal-agent.md` under `## Session Log` (append at the bottom, do not edit prior entries) describing: the `inbox` service was built and deployed, capture confirmed working end-to-end via a live test message, and the "what happens to captured messages" open question remains open (unchanged) since this sub-project deliberately doesn't address it. Update `## Open Questions` only if this closes or changes any existing item (the voice-transcription and reply-logic items remain open; the SSH/root-password cleanup item is unrelated and also remains open).

- [ ] **Step 8: Commit and push**

```bash
git add -A
git status --porcelain
```
Review the output for anything unexpected before committing (should only be the vault file changed in this task — everything else was committed in Tasks 1-5).
```bash
git commit -m "docs(vault): log inbox capture service deployment and live verification"
git push origin main
```
