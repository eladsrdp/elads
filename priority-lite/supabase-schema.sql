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

-- ===== ספירת קריאות API לפריוריטי (usage) =====
-- נצבר ליום / עובד / ישות / שיטה. לא נשמר שום תוכן בקשה — מונים בלבד.
CREATE TABLE IF NOT EXISTS priority_usage (
  day     DATE    NOT NULL,
  emp_id  TEXT    NOT NULL,
  entity  TEXT    NOT NULL,
  method  TEXT    NOT NULL,
  calls   INTEGER NOT NULL DEFAULT 0,
  errors  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, emp_id, entity, method)
);

-- הוספה אטומית למונים הקיימים (במקום דריסה) — נקראת מהשרת דרך rpc('bump_priority_usage')
CREATE OR REPLACE FUNCTION bump_priority_usage(p_rows jsonb) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  r jsonb;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    INSERT INTO priority_usage (day, emp_id, entity, method, calls, errors)
    VALUES ((r->>'day')::date, r->>'emp_id', r->>'entity', r->>'method',
            (r->>'calls')::int, (r->>'errors')::int)
    ON CONFLICT (day, emp_id, entity, method) DO UPDATE
      SET calls  = priority_usage.calls  + EXCLUDED.calls,
          errors = priority_usage.errors + EXCLUDED.errors;
  END LOOP;
END;
$$;

ALTER TABLE priority_usage DISABLE ROW LEVEL SECURITY;
