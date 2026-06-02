# Supabase to Next.js Refactor — Data Model

This is the target v1 PostgreSQL model. Names can be adjusted to ORM conventions, but the concepts and constraints should remain stable.

## ID Policy

- Preserve existing Supabase IDs during migration.
- Generate new server-side record IDs as UUID v4.
- Client-created mobile workout session IDs remain accepted where the sync API requires idempotency.

## Timezone Policy

- Store timestamps as `timestamptz`.
- Exchange timestamps through APIs as UTC ISO strings.
- Format display dates in `America/Sao_Paulo` when local presentation is needed.
- Do not store localized date strings as source-of-truth values.

## Timestamp Update Policy

- Repositories set `updated_at` explicitly on writes.
- Do not depend on implicit database triggers for v1 timestamp updates.
- Preserve imported timestamps during migration.

## `users`

Stores app users. Existing Supabase auth user IDs must be preserved during migration.

Columns:

- `id uuid primary key`
- `email text not null unique`
- `name text`
- `avatar_url text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- unique `email`

## `oauth_accounts`

Links users to OAuth providers.

Columns:

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `provider text not null`
- `provider_account_id text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- unique `(provider, provider_account_id)`
- index `user_id`

## `refresh_tokens`

Stores hashed mobile refresh tokens.

Columns:

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `token_hash text not null unique`
- `family_id uuid not null`
- `expires_at timestamptz not null`
- `revoked_at timestamptz`
- `created_at timestamptz not null default now()`
- `rotated_at timestamptz`

Indexes:

- unique `token_hash`
- index `user_id`
- index `family_id`

Token retention rules:

- mobile access tokens expire after 15 minutes and are not stored server-side
- mobile refresh tokens expire after 30 days, are hashed at rest, and rotate on refresh
- refresh token hashes use HMAC-SHA256 with `FORJA_REFRESH_TOKEN_SECRET`
- reusing a rotated/revoked refresh token revokes the full token family
- admin session cookies expire after 7 days
- one-time mobile auth codes expire after 5 minutes and are single-use

## `admin_sessions`

Stores hashed admin web session tokens.

Columns:

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `session_hash text not null unique`
- `created_at timestamptz not null default now()`
- `expires_at timestamptz not null`
- `revoked_at timestamptz`
- `last_seen_at timestamptz`

Indexes:

- unique `session_hash`
- index `user_id`
- index `expires_at`

Cookie rules:

- cookie name is `forja_admin_session`
- cookie value is opaque and random
- database stores only an HMAC-SHA256 hash using `FORJA_ADMIN_SESSION_SECRET`
- cookie is `HttpOnly`, `Secure` in production, and `SameSite=Lax`

## `mobile_auth_codes`

Stores one-time codes issued after Google OAuth callback for mobile deep-link exchange.

Columns:

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `code_hash text not null unique`
- `redirect_uri text not null`
- `created_at timestamptz not null default now()`
- `expires_at timestamptz not null`
- `used_at timestamptz`

Indexes:

- unique `code_hash`
- index `user_id`
- index `expires_at`

Rules:

- codes expire after 5 minutes
- codes are single-use
- database stores only an HMAC-SHA256 hash using `FORJA_AUTH_CODE_SECRET`

## `plans`

Stable plan identity. Draft and published content lives in related rows.

Columns:

- `id text primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `label text not null`
- `archived_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- index `user_id`
- unique `(user_id, label)` where `archived_at is null`

## `plan_drafts`

Mutable admin draft for a plan.

Columns:

- `plan_id text primary key references plans(id) on delete cascade`
- `user_id uuid not null references users(id) on delete cascade`
- `data jsonb not null`
- `updated_at timestamptz not null default now()`

Indexes:

- index `user_id`

## `plan_revisions`

Published immutable snapshots visible to mobile.

Columns:

- `id uuid primary key`
- `plan_id text not null references plans(id) on delete cascade`
- `user_id uuid not null references users(id) on delete cascade`
- `revision_number integer not null`
- `data jsonb not null`
- `published_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`

Indexes:

- unique `(plan_id, revision_number)`
- index `(user_id, published_at)`
- index `plan_id`

Rules:

- mobile sees only latest published revision per active plan
- draft-only changes must not appear in mobile sync
- published rows are immutable

## `plan_tombstones`

Tracks server-owned plan deletions/archives for mobile sync.

Columns:

- `plan_id text primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `deleted_at timestamptz not null default now()`

Indexes:

- index `(user_id, deleted_at)`

Retention:

- keep tombstones indefinitely in v1

## `workout_sessions`

Mobile-owned workout history synced to server.

Columns:

- `id text primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `data jsonb not null`
- `updated_at timestamptz not null`
- `deleted_at timestamptz`
- `created_at timestamptz not null default now()`

Indexes:

- index `(user_id, updated_at)`
- index `(user_id, deleted_at)`

Conflict resolution:

- workout sessions use latest `updated_at` wins
- when timestamps are equal, keep the stored server row
- older incoming pushes must not overwrite newer stored rows
- deletion is represented by `deleted_at` plus a newer `updated_at`
- older delete tombstones must not overwrite newer active or deleted rows
- keep tombstones indefinitely in v1

## `equipment_photos`

Metadata for equipment photos stored on disk.

Columns:

- `id uuid primary key`
- `user_id uuid not null references users(id) on delete cascade`
- `exercise_id text not null`
- `path text not null`
- `content_type text not null`
- `byte_size integer not null`
- `updated_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`
- `deleted_at timestamptz`

Indexes:

- unique `(user_id, exercise_id)` where `deleted_at is null`
- index `(user_id, updated_at)`

Deletion:

- set `deleted_at` on metadata
- keep the physical file on disk in v1
- uploading a new photo for the same `exercise_id` overwrites the stable file path and clears `deleted_at`

## Sync Cursors

Use stateless signed cursors in v1. Do not create a `sync_cursors` table.

Cursor payloads are opaque to clients and may contain:

- `lastChangedAt`
- `lastId`

Implementation:

- sign with HMAC SHA-256 using `FORJA_SYNC_CURSOR_SECRET`
- encode as base64url payload plus signature

## `import_jobs`

Tracks AI import requests for debugging and rate visibility.

Columns:

- `id uuid primary key`
- `user_id uuid references users(id) on delete set null`
- `label text`
- `status text not null`
- `error_message text`
- `created_at timestamptz not null default now()`
- `completed_at timestamptz`

Storage rules:

- store metadata only
- `status` is one of `pending`, `completed`, `failed`
- `error_message` is sanitized and must not include provider secrets or raw payload content
- do not store raw images or raw AI import payloads in v1
- extracted results are persisted only through normal user-accepted create/update flows

## JSON Data Validation

Even when plan/session data is stored as JSONB, route handlers and repositories must validate:

- incoming JSON against `packages/domain`
- outgoing JSON before returning it to mobile
- migrated Supabase JSON before import

## Migration Mapping

Supabase `plans` maps to:

- `plans`
- `plan_drafts`
- `plan_revisions`

For existing synced plans:

- create a `plans` row preserving `id`, `user_id`, `created_at`, `updated_at`
- create a draft from `data`
- create one published revision from `data`
- if `deleted_at` exists, create a tombstone and set `archived_at`

Supabase `workout_sessions` maps to:

- `workout_sessions`

Supabase Storage `equipment-photos/{userId}/{exerciseId}.jpg` maps to:

- disk file at the same relative path
- one `equipment_photos` metadata row
