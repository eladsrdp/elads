-- Priority Lite — Supabase Schema
-- הרץ פעם אחת בלבד דרך SQL Editor ב-Supabase

create table if not exists employees (
  phone            text primary key,
  email            text not null,
  priority_emp_id  text not null,
  name             text not null,
  active           boolean not null default true
);

create table if not exists otp_codes (
  phone        text primary key,
  code_hash    text not null,
  expires_at   bigint not null,
  attempts     integer not null default 0,
  sent_count   integer not null default 0,
  window_start bigint not null default 0
);

-- מיגרציה: הוספת TOTP — הרץ פעם אחת
alter table employees add column if not exists totp_secret text;
