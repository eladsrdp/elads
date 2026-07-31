-- סכמת הליבה של תוכנית ליווי החממה. ראו design doc: hachamama-parenting-program/docs/2026-07-31-design.md
create extension if not exists pgcrypto;

create table participants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  signup_source_ref text,
  signup_at timestamptz not null,
  day1_date date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  created_at timestamptz not null default now()
);

create table content_days (
  day_number int primary key,
  title text
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  content_day_number int not null references content_days(day_number),
  send_offset_time text not null, -- 'HH:MM', בזמן מקומי ישראל
  order_in_day int not null default 0,
  body_text text not null,
  media_url text,
  media_type text check (media_type in ('image', 'video', 'audio', 'document')),
  created_at timestamptz not null default now()
);

create table daily_triggers (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id),
  calendar_date date not null,
  content_day_number int not null references content_days(day_number),
  trigger_sent_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (participant_id, calendar_date)
);

create table message_deliveries (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id),
  message_id uuid not null references messages(id),
  daily_trigger_id uuid not null references daily_triggers(id),
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (participant_id, message_id)
);

create table session_windows (
  participant_id uuid primary key references participants(id),
  opened_at timestamptz not null,
  expires_at timestamptz not null
);

create index idx_daily_triggers_unsent on daily_triggers (calendar_date) where trigger_sent_at is null;
create index idx_deliveries_by_trigger on message_deliveries (daily_trigger_id, status);
create index idx_deliveries_due_pending on message_deliveries (status, scheduled_for) where status = 'pending';

-- SECURITY: הטבלאות מכילות PII (שם מלא, טלפון). מפעילים RLS בלי policies כלל —
-- זה חוסם אוטומטית anon/authenticated (מפתחות שהמערכת הזו לא משתמשת בהם ולעולם
-- לא צריכה להפיץ), בעוד ש-service role (היחיד שהשרת מתחבר איתו, ראו env.ts /
-- repository/db.ts) ממשיך לעבוד — service role עוקף RLS מטבעו. בלי זה, ה-linter
-- הפנימי של Supabase מתריע "RLS disabled on public table", וכל שימוש עתידי
-- (למשל דשבורד מנחות עם anon key) יימצא פתוח לגמרי כברירת מחדל.
alter table participants enable row level security;
alter table content_days enable row level security;
alter table messages enable row level security;
alter table daily_triggers enable row level security;
alter table message_deliveries enable row level security;
alter table session_windows enable row level security;
