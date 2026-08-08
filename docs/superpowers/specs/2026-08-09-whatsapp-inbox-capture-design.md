# WhatsApp Inbox Capture — Design

## Context

Phase 1 of the personal WhatsApp agent project ([[whatsapp-personal-agent]] in the vault) gave Claude the ability to *send* WhatsApp messages via a self-hosted WAHA instance (Hetzner server, `188.245.198.72`), linked to the user's personal number. This spec covers the first piece of phase 2: **capturing incoming messages** from a single dedicated chat, with no reply logic yet — what to do with captured messages is an explicit non-goal, decided later.

Phase 2 was scoped down from a single large "conversational agent + Outlook + invoices" request into independent sub-projects (see the vault topic's Open Questions). This is sub-project #1 of that breakdown, further narrowed to ingestion-only per the user's request mid-brainstorm.

## Goal

Reliably capture every message (text and voice) sent to/from a single dedicated WhatsApp chat — "Message Yourself" (`972542438624@c.us`) — into a queryable store on the same server WAHA already runs on. No auto-reply, no transcription, no external exposure.

## Non-goals

- Deciding what to do with captured messages (reply logic, agent loop) — future spec.
- Voice note transcription or audio download — future spec (phase 2 sub-project #2). Voice messages are recorded as metadata only.
- Outlook integration, invoice flow — separate future specs, unaffected by this change.
- Multi-chat capture — only the one dedicated self-chat is in scope.

## Architecture

A new service, `inbox`, is added as a second container in `waha/docker-compose.yml`, alongside the existing `waha` service, on the same Hetzner server. It sits entirely on the Docker-internal network — no port is published to the host or the public internet, matching the existing security posture (WAHA itself is bound to `127.0.0.1` only).

```
WhatsApp (self-chat) → WAHA (NOWEB engine) → [Docker-internal POST] → inbox service → SQLite
```

WAHA's `WHATSAPP_HOOK_URL` is set to `http://inbox:8080/webhook` (Docker DNS name, not a public address). `WHATSAPP_HOOK_EVENTS` stays `message`.

The `inbox` service is a small Hono + TypeScript app (matching the existing convention in `priority-lite/server` and `hachamama-parenting-program/server`), using `better-sqlite3` for storage. It exposes exactly one route: `POST /webhook`.

## Data flow

1. A message is sent to or from the dedicated self-chat. WAHA fires a `message` webhook event to `inbox`.
2. `inbox` checks the event type is `message` and the chat id matches the configured `SELF_CHAT_ID` env var (`972542438624@c.us`). Any other chat is dropped (200 OK, no storage) — this is not an error, just noise filtering.
3. `direction` is derived from the payload's `fromMe` boolean (`true` → `outgoing`, `false` → `incoming`) — both directions are captured since this is a self-chat.
4. Message kind is determined from the WAHA payload's `type` field:
   - Text (`chat`) → store `body` as-is.
   - Voice note (`ptt`) → store with `type=voice`, `body=NULL`. The audio file is never downloaded in this phase.
   - Anything else (image, document, etc.) → store with `type=other`, `body=NULL`, full payload preserved in `raw_json` for future use.
5. A row is inserted into the `messages` table (schema below), including the full raw webhook JSON for forward-compatibility.
6. `inbox` returns `200` promptly.

## Data model

SQLite database file on a named Docker volume (`inbox_data:/app/data/inbox.db`), following the same persistence pattern as `waha_sessions`.

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  waha_message_id TEXT NOT NULL UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  type TEXT NOT NULL CHECK (type IN ('text', 'voice', 'other')),
  body TEXT,
  timestamp INTEGER NOT NULL,
  raw_json TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
```

`waha_message_id` is unique so a duplicate webhook delivery (WAHA retries on non-2xx responses) doesn't create a duplicate row — the insert fails silently on conflict (`INSERT OR IGNORE`).

## Error handling

| Situation | Behavior |
|---|---|
| Payload doesn't parse / unrecognized shape | Log, return `200` (don't trigger WAHA retry storms on something a retry can't fix) |
| Chat id doesn't match `SELF_CHAT_ID` | Return `200`, no storage (expected noise, not an error) |
| DB write fails (e.g. disk full) | Return `500` — WAHA retries per its webhook retry policy, message isn't silently lost |
| Duplicate `waha_message_id` | Insert is ignored (unique constraint), still returns `200` |
| Service crash | `restart: unless-stopped` on the container (same as `waha` service) auto-recovers |

## Testing

Vitest, using Hono's `app.request()` against the webhook route directly (same pattern as `priority-lite/server`), no real WAHA or network dependency:

- Text message payload from the configured self-chat → row appears in `messages` with `type=text` and correct `body`.
- Message payload from a *different* chat id → no row is written, response is still `200`.
- Voice note (`ptt`) payload from the self-chat → row appears with `type=voice`, `body=NULL`.
- Same `waha_message_id` delivered twice → only one row exists after both requests.
- Malformed payload (missing expected fields) → response is `200`, no crash, no row written.

Live verification against the real WAHA instance (sending an actual test message and confirming it lands in the SQLite file over SSH) happens manually during deployment, same as the phase 1 WAHA setup — not part of the automated test suite.

## Explicitly deferred (tracked as open questions on [[whatsapp-personal-agent]])

- What happens to captured messages (reply logic, agent loop) — sub-project to design later.
- Voice note transcription and audio retrieval — sub-project #2.
- Whether `inbox` ever needs to be reachable from outside the Docker network (would require adding `WHATSAPP_HOOK_HMAC_KEY` verification) — not needed for this scope.
