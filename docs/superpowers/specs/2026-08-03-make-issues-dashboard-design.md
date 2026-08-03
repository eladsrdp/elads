# Make Issues Dashboard — Design Spec

## Overview

An internal web dashboard that receives scenario-failure webhooks from Make.com and lets the RDP team triage them without digging through email. A scenario error handler in Make POSTs the failure to a new API endpoint; the dashboard shows all open issues front-and-center, and marking one "handled" or "ignored" removes it from the main view (it moves to a History screen).

Users: 3-4 fixed team members, username+password login. Not part of the five content agents (Yael/Yuval/Chen/Noa) — a standalone internal tool, structured like `priority-lite/`.

## Architecture

New top-level folder `make-issues/`, npm-workspaces monorepo matching `priority-lite/`'s proven layout:

- `shared/` — TypeScript types shared between server and client (Issue, IssueType, IssueStatus, User).
- `server/` — Hono API. Supabase (Postgres) for storage. Deployed to Vercel via the same Build Output API approach validated in `priority-lite/` (`api-src/index.ts` exporting `getRequestListener(app.fetch)`).
- `client/` — React 19 + Vite + Tailwind, RTL Hebrew UI.

Rationale: reuses a stack and deployment path already debugged end-to-end in this repo (see [[priority-lite-app]]) instead of re-solving solved problems (esbuild CJS bundling, Vercel function export shape, Supabase serverless fit).

## Data Model

### `issues` table (Supabase/Postgres)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | `gen_random_uuid()` |
| `client_name` | text, not null | from Make payload |
| `scenario_name` | text, not null | from Make payload |
| `description` | text, not null | free text from Make payload |
| `issue_type` | text, not null | enum, see below |
| `status` | text, not null, default `'open'` | `open` \| `handled` \| `ignored` |
| `scenario_link` | text, not null | URL to the Make scenario |
| `run_link` | text, not null | URL to the specific execution |
| `created_at` | timestamptz, default `now()` | server receipt time |
| `resolved_at` | timestamptz, nullable | set when status leaves `open` |
| `resolved_by` | text, nullable | username of whoever resolved it |

`issue_type` fixed values (Hebrew, as given by the user — stored verbatim, not re-encoded to English enum keys, since Make sends them as-is and the UI displays them as-is):
- `עומדות להיגמר האופרציות`
- `נגמרו האופרציות`
- `תקלה בסנריו`
- `סנריו נפל`

The webhook validator (zod) enforces the payload's `issueType` is one of these four exact strings; anything else is rejected with 400.

### `users` table (Supabase/Postgres)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `username` | text, unique, not null | |
| `password_hash` | text, not null | bcrypt |
| `refresh_token_hash` | text, nullable | bcrypt hash of current refresh token (rotated on each use) |

3-4 rows seeded via a `seed.ts` script (input file excluded from git), same pattern as `priority-lite/server/seed-whitelist.ts`.

## Webhook Ingestion

`POST /api/webhook/issues`

- Auth: `Authorization: Bearer <WEBHOOK_SECRET>` header, compared against the `WEBHOOK_SECRET` env var (constant-time compare). Missing/wrong secret → 401, no body detail. The secret is never accepted via query string.
- Body (JSON), validated with zod:
  ```
  {
    clientName: string (1-200 chars),
    scenarioName: string (1-200 chars),
    description: string (1-2000 chars),
    issueType: one of the 4 fixed strings,
    scenarioLink: string, valid URL,
    runLink: string, valid URL
  }
  ```
- On success: inserts a row with `status='open'`, `created_at=now()`. Returns `{ ok: true, id }`.
- On validation failure: 400 with a generic message (field-level detail is fine here since this is a server-to-server integration endpoint Make's HTTP module will log, not an end-user-facing surface — but no stack traces, no DB/table names).
- Server logs only metadata (client, scenario, type, timestamp) on receipt — not the full payload — to keep logs clean even though this data isn't personal (it's business/system data, not individual PII).

The Make-side configuration (adding an HTTP module to each scenario's Error Handler that POSTs here) is the user's responsibility to wire up per-scenario; this spec covers only the receiving side.

## Auth

Username + password login for 3-4 fixed accounts (no self-registration).

- `POST /api/auth/login` — `{username, password}` → verifies bcrypt hash → issues:
  - Access token: JWT, 1-hour expiry, `HttpOnly, Secure, SameSite=Strict` cookie.
  - Refresh token: random 32-byte token, bcrypt-hashed and stored in `users.refresh_token_hash`, separate `HttpOnly, Secure, SameSite=Strict` cookie, 30-day expiry.
- `POST /api/auth/refresh` — validates the refresh token against the stored hash, rotates it (issues + stores a new one, invalidating the old), issues a new access token. Called transparently by the client when a request 401s.
- `POST /api/auth/logout` — clears both cookies and nulls `refresh_token_hash`.
- Login endpoint is rate-limited (e.g. 5 attempts / 15 min per username) to resist brute force given fixed, guessable-ish usernames. Tracked via a small `login_attempts` table in Supabase (not in-memory — Vercel serverless instances are ephemeral and don't share memory across invocations), same approach as `priority-lite/server`'s OTP attempt tracking.
- **Forgotten password**: no self-service reset in v1. An admin resets manually via direct Supabase update (`UPDATE users SET password_hash = <new bcrypt hash> WHERE username = '...'`), mirroring how `priority-lite` handles a lost TOTP device. Flagged as a caveat, not solved automatically, since only 3-4 fixed accounts exist.

## Issues API (dashboard-facing, requires valid access token)

- `GET /api/issues?status=open` — list open issues, newest first.
- `GET /api/issues?status=handled,ignored` — history view, newest-resolved first.
- `PATCH /api/issues/:id` — body `{status: 'handled' | 'ignored'}` → sets `status`, `resolved_at=now()`, `resolved_by=<username from access token>`.

## Client UI

RTL Hebrew, two screens behind login:

1. **Open issues (default view)** — polls `GET /api/issues?status=open` every 15s. A toggle switch flips between:
   - **Cards** (grid): client name, colored badge per issue type, scenario name, description, two links (סנריו / ריצה), timestamp, "✔ טופל" / "✕ להתעלם" buttons.
   - **Table**: same fields as compact rows.
   Clicking טופל/להתעלם optimistically removes the row from view immediately, then PATCHes; on failure, the row reappears with an inline error.
2. **History** — same card/table toggle (view preference persists across screens via localStorage), shows `handled`+`ignored` issues with `resolved_at` and `resolved_by`, newest first.

Simple top nav: "פתוחות" | "היסטוריה" | logout.

## Security Checklist (per org policy)

- No secrets in code — `WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET` all from env vars; `.env.example` with names only; `.env` gitignored.
- All DB access via Supabase client (parameterized), no string-concatenated SQL.
- Passwords: bcrypt only.
- JWT: short-lived access token + separate refresh token (see Auth section) — satisfies the short-expiry + refresh-token requirement.
- Cookies: HttpOnly + Secure + SameSite; no tokens in localStorage.
- Webhook secret only in headers, never in URL query string.
- Login rate-limited.
- Errors returned to clients are generic; full detail (if any) stays server-side in logs; no stack traces, table/column names, or internal paths in HTTP responses.
- CORS: dashboard client origin only (no browser CORS applies to the Make→webhook path since it's a server-to-server call).

## Testing

- Unit: webhook validation (correct/incorrect secret; valid/invalid payload per field, including rejecting an `issueType` outside the 4 fixed strings); status-transition logic (`open→handled`, `open→ignored`, and rejecting invalid transitions); login (correct/incorrect password, rate limit trip); refresh flow (valid/expired/reused-old-token rotation).
- Manual E2E in browser: simulate a Make POST (e.g. via curl/Postman with the real secret) → issue appears on the open screen within one poll cycle → mark טופל → disappears from open, appears in history with correct `resolved_by`.

## Out of Scope (v1)

- Configuring the Make-side Error Handler HTTP modules themselves (user's task, this system just receives).
- Filtering/searching/grouping-by-client on the dashboard (can be added later if needed — not requested).
- Push notifications / sound alerts beyond the 15s auto-refresh.
- Self-service user registration or password reset flow (accounts are seeded manually; a caveat to flag to the user, not to solve automatically).
