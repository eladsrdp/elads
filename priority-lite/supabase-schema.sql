-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

CREATE TABLE IF NOT EXISTS employees (
  phone            TEXT PRIMARY KEY,
  email            TEXT NOT NULL,
  priority_emp_id  TEXT NOT NULL,
  name             TEXT NOT NULL,
  active           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS otp_codes (
  phone        TEXT PRIMARY KEY,
  code_hash    TEXT NOT NULL,
  expires_at   BIGINT NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  sent_count   INTEGER NOT NULL DEFAULT 1,
  window_start BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS local_checklist_items (
  id          BIGSERIAL PRIMARY KEY,
  phone       TEXT NOT NULL REFERENCES employees(phone),
  task_id     BIGINT,
  text        TEXT NOT NULL,
  done        BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS local_drafts (
  id          BIGSERIAL PRIMARY KEY,
  phone       TEXT NOT NULL REFERENCES employees(phone),
  task_id     BIGINT,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disable Row Level Security — this is a server-side-only app (service key used)
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE local_checklist_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE local_drafts DISABLE ROW LEVEL SECURITY;
