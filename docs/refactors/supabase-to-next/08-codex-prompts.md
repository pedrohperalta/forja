# Supabase to Next.js Refactor — Codex Prompts

Use these prompts to start autonomous implementation sessions. Each prompt assumes the repository root is the current working directory.

## Master Prompt

```text
Implement the next slice from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Before editing code, read:
- AGENTS.md
- docs/ARCHITECTURE.md
- docs/styleguides/typescript.md
- CONTRIBUTING.md
- docs/refactors/supabase-to-next/README.md
- docs/refactors/supabase-to-next/01-decisions.md
- docs/refactors/supabase-to-next/02-api-contract.md
- docs/refactors/supabase-to-next/03-data-model.md
- docs/refactors/supabase-to-next/05-implementation-slices.md
- docs/refactors/supabase-to-next/06-validation-checklist.md
- docs/refactors/supabase-to-next/07-autonomous-runbook.md

Work on branch `track/supabase-to-next`.
Run `git status --short` before editing.
Follow strict TDD.
Implement only the current slice.
Do not push to main.
Do not perform production cutover.
At the end, report changed files and verification commands/results.
```

## Slice Prompts

### Slice 0 — Move Expo App To Mobile Workspace

```text
Implement Slice 0 from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Goal: move the existing Expo app from repo root into `mobile/`, migrate the repo to pnpm workspaces, preserve current mobile behavior, and keep EAS workflow behavior equivalent after path updates.

Do not change Supabase call sites, route names, store logic, or UI behavior.
Validate mobile tests/typecheck/lint from the new workspace, or report the exact blocker if any command cannot run.
```

### Slice 1 — Shared Domain Package

```text
Implement Slice 1 from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Goal: create `packages/domain` with shared Zod schemas/types for plans, workout sessions, sync, photos, auth payloads, and admin AI import responses.

The package must not depend on React, React Native, Expo, Next.js, Node-only APIs, or database clients.
Write schema tests first.
```

### Slice 2 — Next.js Scaffold

```text
Implement Slice 2 from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Goal: add `web/` Next.js App Router app with `GET /api/health`, minimal protected admin shell placeholder, server-only env validation, and standalone output.

Do not touch mobile behavior, Supabase call sites, or database schema.
Write route/render/env tests first.
```

### Slice 3 — Database Schema And Repositories

```text
Implement Slice 3 from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Goal: add Drizzle PostgreSQL schema/migrations/repositories matching `03-data-model.md`, including pgcrypto, users, oauth_accounts, refresh_tokens, admin_sessions, mobile_auth_codes, plans, plan_drafts, plan_revisions, plan_tombstones, workout_sessions, equipment_photos, and import_jobs.

Repository tests must use `TEST_DATABASE_URL` and refuse to run unless the DB name is `forja_test`.
No `sync_cursors` table.
Write repository tests first.
```

### Slice 4 — Mobile/Auth API

```text
Implement Slice 4 from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Goal: implement mobile auth endpoints and the shared Google callback according to `02-api-contract.md`.

Include signed OAuth state, allowed-user email enforcement, hashed one-time mobile auth codes, JWT access tokens, opaque refresh tokens with rotation, token-family revocation on reuse, and structured errors.
Do not modify the existing mobile auth store yet.
Write route/auth tests first.
```

### Slice 5 — Admin Auth Shell

```text
Implement Slice 5 from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Goal: implement admin cookie auth helpers, admin Google start/logout endpoints, `forja_admin_session` cookie, `admin_sessions` persistence, admin allowlist, and protected `/admin` shell.

Do not change plan CRUD or mobile app behavior.
Write admin auth tests first.
```

### Slice 6 — Plan Draft And Publish API

```text
Implement Slice 6 from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Goal: implement structured admin plan draft CRUD, exercise editing/reordering, publish, archive, and minimal admin screens.

Draft changes must never appear in mobile sync. Publishing creates immutable revisions. Archiving creates tombstones. Raw JSON editing cannot be the primary workflow or bypass validation.
Write service/route/component tests first.
```

### Slice 7 — Mobile Plan Pull API

```text
Implement Slice 7 from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Goal: expose published plan changes through `/api/mobile/v1/sync/pull`.

Use stateless signed cursors, deterministic `(changedAt, id)` ordering, max 500 changed records, `hasMore`, tombstones, and no draft leakage.
Write route tests first.
```

### Slice 8 — Mobile Workout Session Push API

```text
Implement Slice 8 from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Goal: implement `/api/mobile/v1/sync/push` and workout-session delete endpoints.

Workout sessions use latest `updatedAt` wins. Equal timestamps keep server row. Deletes are tombstones with `deletedAt` plus newer `updatedAt`. Do not return manual conflicts for normal latest-version resolution.
Write route/service tests first.
```

### Slice 9 — Mobile Sync Client Adapter

```text
Implement Slice 9 from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Goal: add mobile API client abstraction and switch syncService from Supabase to the Next.js REST API.

Unauthenticated sync no-ops. Pull follows `hasMore` pages up to 20 pages. Refresh-token 401 clears remote tokens but preserves local MMKV workout data.
Write mobile sync tests first.
```

### Slice 10 — Equipment Photo API

```text
Implement Slice 10 from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Goal: implement authenticated equipment photo upload/list/download/delete.

JPEG only, magic bytes validation, 5 MB max, stable server-derived path, no client filesystem paths, delete sets `deletedAt` and keeps physical file, re-upload clears `deletedAt`.
Write route/storage tests first.
```

### Slice 11 — Mobile Photo Client Adapter

```text
Implement Slice 11 from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Goal: switch `useEquipmentPhoto` from Supabase Storage to the new photo API client.

Unauthenticated behavior remains local-only. Local save wins if upload fails. Restore lists/downloads through the new API when authenticated.
Write hook/client tests first.
```

### Slice 12 — Admin AI Import

```text
Implement Slice 12 from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Goal: implement admin-only AI import UI and `POST /api/admin/import/extract-workout`.

Require admin auth, JPEG/base64 validation, 5 MB source-image limit, Anthropic server-only key/model env, import job metadata only, no raw image/payload storage, sanitized errors, and domain-schema validation.
Write route/service/component tests first.
```

### Slice 13 — Remove Mobile AI Import Dependency

```text
Implement Slice 13 from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Goal: remove or disable mobile AI import runtime path.

Mobile must not call Supabase Edge Function `extract-workout` or `/api/mobile/v1/import/extract-workout`. Remove/disable UI entry points if present. Keep unrelated sync/photo behavior unchanged.
Write/update mobile tests first.
```

### Slice 14 — Supabase Migration Scripts

```text
Implement Slice 14 from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Goal: add migration export, validation, SQL generation, photo download/import tooling, and personal seed.

Use `scripts/migration/`. Keep `.migration/` ignored. Generated SQL must preserve IDs/timestamps, run in a single transaction, target an empty migrated DB, and be regenerated after schema/mapping changes.
Write migration tests first.
```

### Slice 15 — Deployment

```text
Implement Slice 15 from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Goal: add `deploy/forja/` Portainer/Docker deployment config, local compose override, Dockerfile, backup/restore scripts, and deployment README.

Use Node 24, Postgres 18, Next standalone output, stack `forja`, services `forja-web`, `forja-postgres`, `forja-backup`, external network `root_default`, Cloudflare-only middleware, non-root web container, `/data/uploads`, and SSH build-on-VPS runbook.
Write config/backup/retention/restore tests where practical.
```

### Slice 16 — Remove Supabase Runtime Dependency

```text
Implement Slice 16 from `docs/refactors/supabase-to-next/05-implementation-slices.md`.

Goal: remove Supabase runtime dependency after auth, sync, photos, and mobile AI import removal are complete.

No runtime source under `mobile/src`, `web`, or `packages/domain` may reference `@supabase`, `EXPO_PUBLIC_SUPABASE`, `supabase.from`, `storage.from`, `functions/v1`, or `extract-workout`.
Write/update affected tests first.
```
