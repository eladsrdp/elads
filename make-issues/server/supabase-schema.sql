create extension if not exists pgcrypto;

create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  scenario_name text not null,
  description text,
  issue_type text not null,
  status text not null default 'open',
  scenario_link text not null,
  run_link text,
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
