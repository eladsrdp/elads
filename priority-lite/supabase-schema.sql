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

-- Disable Row Level Security — this is a server-side-only app (service key used)
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes DISABLE ROW LEVEL SECURITY;
