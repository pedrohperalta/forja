create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists oauth_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  provider_account_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint oauth_accounts_provider_account_unique unique (provider, provider_account_id)
);
create index if not exists oauth_accounts_user_id_idx on oauth_accounts(user_id);

create table if not exists refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  family_id uuid not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);
create index if not exists refresh_tokens_user_id_idx on refresh_tokens(user_id);
create index if not exists refresh_tokens_family_id_idx on refresh_tokens(family_id);

create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz
);
create index if not exists admin_sessions_user_id_idx on admin_sessions(user_id);
create index if not exists admin_sessions_expires_at_idx on admin_sessions(expires_at);

create table if not exists mobile_auth_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  code_hash text not null unique,
  redirect_uri text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index if not exists mobile_auth_codes_user_id_idx on mobile_auth_codes(user_id);
create index if not exists mobile_auth_codes_expires_at_idx on mobile_auth_codes(expires_at);

create table if not exists plans (
  id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  label text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists plans_user_id_idx on plans(user_id);
create unique index if not exists plans_user_label_active_unique on plans(user_id, label) where archived_at is null;

create table if not exists plan_drafts (
  plan_id text primary key references plans(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists plan_drafts_user_id_idx on plan_drafts(user_id);

create table if not exists plan_revisions (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null references plans(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  revision_number integer not null,
  data jsonb not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint plan_revisions_plan_revision_unique unique (plan_id, revision_number)
);
create index if not exists plan_revisions_user_published_idx on plan_revisions(user_id, published_at);
create index if not exists plan_revisions_plan_id_idx on plan_revisions(plan_id);

create table if not exists plan_tombstones (
  plan_id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  deleted_at timestamptz not null default now()
);
create index if not exists plan_tombstones_user_deleted_idx on plan_tombstones(user_id, deleted_at);

create table if not exists workout_sessions (
  id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists workout_sessions_user_updated_idx on workout_sessions(user_id, updated_at);
create index if not exists workout_sessions_user_deleted_idx on workout_sessions(user_id, deleted_at);

create table if not exists equipment_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  exercise_id text not null,
  path text not null,
  content_type text not null,
  byte_size integer not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists equipment_photos_user_exercise_active_unique on equipment_photos(user_id, exercise_id) where deleted_at is null;
create index if not exists equipment_photos_user_updated_idx on equipment_photos(user_id, updated_at);

create table if not exists import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  label text,
  status text not null,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
