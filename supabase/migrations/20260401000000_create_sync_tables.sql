-- Sync tables for Forja cloud backup
-- Plans and workout sessions are stored as JSONB to decouple schema from app types.
-- RLS ensures each user can only access their own rows.

-- Plans table
create table if not exists public.plans (
  id         text        primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  data       jsonb       not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.plans enable row level security;

create policy "Users can manage their own plans"
  on public.plans
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists plans_user_id_idx on public.plans (user_id);

-- Workout sessions table
create table if not exists public.workout_sessions (
  id         text        primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  data       jsonb       not null,
  updated_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.workout_sessions enable row level security;

create policy "Users can manage their own sessions"
  on public.workout_sessions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists workout_sessions_user_id_idx on public.workout_sessions (user_id);
