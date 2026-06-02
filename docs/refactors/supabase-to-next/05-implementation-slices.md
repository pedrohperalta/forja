# Supabase to Next.js Refactor — Implementation Slices

Use these slices as independent Codex tasks. Each slice should be implemented with tests first. Do not combine slices unless the user explicitly asks for a larger batch.

## Execution Rules For Codex

- Use project branch naming from `AGENTS.md`: `track/supabase-to-next`.
- Keep all implementation commits on the track branch until the owner explicitly approves merging to `main`.
- Implement slices in order unless a later slice is explicitly unblocked and does not touch the same files.
- Keep each slice focused on its allowed files and done criteria.
- Follow strict TDD: add or update tests before implementation changes.
- Do not push to `main`.

## Slice 0 — Move Expo App To Mobile Workspace

### Goal

Move the existing Expo mobile app from the repository root into `mobile/` without changing runtime behavior.

### Allowed Files

- mobile app files moved from repo root into `mobile/`
- root package/workspace config
- root TypeScript/config files only as needed to keep tooling working
- documentation paths that must change after the move
- EAS workflow paths/config only as needed to keep existing build behavior

### Must Not Change

- mobile app behavior
- Supabase call sites
- route names
- store logic
- UI

### Tests First

Because this is a mechanical move, preserve existing tests and run them after the move:

- mobile test suite still runs from `mobile/`
- mobile typecheck still runs from `mobile/`
- path aliases still resolve
- Expo Router still sees `mobile/src/app`

### Done

- Expo app lives in `mobile/`
- repo uses `pnpm` workspaces with `pnpm-workspace.yaml`
- root `package.json` declares `packageManager`
- root `package.json` declares `engines.node` as `>=24 <25`
- `.nvmrc` pins Node to `24`
- `pnpm-lock.yaml` is generated and `package-lock.json` is removed
- workspace packages are named `@forja/mobile`, `@forja/web`, and `@forja/domain`
- root workspace scripts can run mobile checks
- existing mobile tests pass from `mobile/`
- no behavior changes are mixed into the move
- EAS preview build behavior remains equivalent after path updates

## Slice 1 — Shared Domain Package

### Goal

Create `packages/domain` with shared schemas and types used by mobile, web, and migration scripts.

### Allowed Files

- `packages/domain/**`
- root package/workspace config if needed
- `tsconfig.json` or dedicated TS config files if needed
- tests for the package

### Must Not Change

- mobile app behavior under `mobile/`
- Supabase call sites
- Next.js app

### Tests First

- valid plan schema passes
- invalid plan schema fails
- valid workout session schema passes
- sync pull response schema validates
- sync push request schema validates
- import response schema validates
- category constants match current mobile categories

### Done

- domain tests pass
- package exports schemas and inferred types
- no runtime dependency on React, Expo, Next.js, or Node-only APIs
- web, mobile, and migration scripts import shared contracts from `@forja/domain`

## Slice 2 — Next.js Scaffold

### Goal

Add the `web/` Next.js app with a health route and minimal admin shell.

### Allowed Files

- `web/**`
- root package/workspace config
- docs only if setup commands are needed

### Must Not Change

- mobile app behavior under `mobile/`
- Supabase call sites
- database schema

### Tests First

- health route returns `200`
- health route returns `{ ok: true }`
- admin route renders a minimal protected-shell placeholder

### Done

- `web` typecheck passes
- `web` build passes
- health route test passes
- `web` is configured for Next.js standalone output
- server env validation fails fast for missing required env vars

## Slice 3 — Database Schema And Repositories

### Goal

Add PostgreSQL schema and server repositories for users, OAuth accounts, refresh tokens, admin sessions, mobile auth codes, plans, plan drafts, plan revisions, plan tombstones, workout sessions, equipment photos, and import jobs.

### Allowed Files

- `web/src/server/db/**`
- `web/src/server/repositories/**`
- `web` database config/migrations
- repository tests
- `docs/refactors/supabase-to-next/03-data-model.md` only if model changes are necessary

### Must Not Change

- mobile app under `mobile/`
- auth route handlers
- admin UI beyond test helpers

### Tests First

- create/find user
- link OAuth account
- preserve explicit user ID
- create plan draft
- publish plan revision
- upsert workout session idempotently
- create/update equipment photo metadata
- store and revoke hashed refresh token
- store and revoke hashed admin session
- store, use, and expire one-time mobile auth code
- create plan tombstone
- create import job metadata

### Done

- migrations apply from a clean database
- migrations enable `pgcrypto`
- repository tests pass
- repository functions have explicit return types
- no `sync_cursors` table is created
- repository tests require `TEST_DATABASE_URL` pointing to `forja_test`

## Slice 4 — Mobile/Auth API

### Goal

Implement mobile auth endpoints with Google OAuth start/exchange, refresh rotation, logout, and current user.

### Allowed Files

- `web/app/api/mobile/v1/auth/**`
- `web/app/api/auth/google/callback/**`
- `web/src/server/auth/**`
- `web/src/server/repositories/**` only where auth requires changes
- auth tests
- shared domain auth schemas

### Must Not Change

- existing mobile auth store under `mobile/src`
- admin plan screens
- sync/photo/import logic

### Tests First

- start returns a Google OAuth URL
- OAuth callback validates signed state
- OAuth callback rejects non-allowlisted email
- exchange creates a user on first login
- exchange links existing Google account
- refresh rotates tokens
- old refresh token cannot be reused
- logout revokes token
- me returns current user for a valid bearer token
- endpoints return structured errors

### Done

- auth route tests pass
- no secrets are exposed to client bundles
- refresh tokens are hashed at rest
- one-time auth codes are hashed at rest and single-use

## Slice 5 — Admin Auth Shell

### Goal

Implement admin cookie auth helpers and protect `/admin`.

### Allowed Files

- `web/app/admin/**`
- `web/app/api/auth/google/callback/**`
- `web/src/server/auth/**`
- `web/app/api/admin/auth/**` if admin auth endpoints are separated
- admin auth tests

### Must Not Change

- mobile auth endpoints except shared helpers
- plan CRUD
- mobile app under `mobile/`

### Tests First

- unauthenticated admin request redirects or shows login state
- authenticated admin request renders admin shell
- admin cookie is HTTP-only
- admin cookie uses `forja_admin_session`
- admin session is stored hashed in `admin_sessions`
- logout clears admin session

### Done

- admin shell is protected
- non-allowlisted Google accounts cannot sign in
- mobile bearer token flow still passes

## Slice 6 — Plan Draft And Publish API

### Goal

Implement server-side plan draft CRUD and publish flow, plus minimal admin screens.

### Allowed Files

- `web/app/admin/plans/**`
- `web/src/server/services/plans/**`
- `web/src/server/repositories/**`
- `packages/domain/**`
- tests for plan services/routes

### Must Not Change

- mobile sync service
- equipment photos
- AI import

### Tests First

- create draft plan
- update draft plan
- edit structured exercise fields
- reorder exercises
- publish draft as immutable revision
- list admin plans
- archived plan is excluded from active admin list unless explicitly requested
- invalid plan data is rejected

### Done

- admin can create/edit/publish a plan locally
- admin routes implemented: `/admin`, `/admin/login`, `/admin/plans`, `/admin/plans/new`, `/admin/plans/[planId]`
- admin plan editing primary workflow is structured, not raw JSON
- published revisions are immutable

## Slice 7 — Mobile Plan Pull API

### Goal

Expose published plan changes to mobile through REST.

### Allowed Files

- `web/app/api/mobile/v1/plans/**`
- `web/app/api/mobile/v1/sync/pull/**`
- `web/src/server/services/sync/**`
- shared sync schemas
- route tests

### Must Not Change

- mobile syncService implementation yet
- workout session push
- photos

### Tests First

- unauthenticated request returns 401
- absent cursor returns all published plans
- cursor returns only changed plans
- cursor is stateless and signed
- tampered cursor returns 400
- changes are ordered by `(changedAt, id)`
- archived/deleted plans return tombstones
- drafts are never returned
- response validates with shared schema

### Done

- mobile plan pull route tests pass
- API contract remains compatible with `02-api-contract.md`

## Slice 8 — Mobile Workout Session Push API

### Goal

Implement mobile workout session push and delete endpoints.

### Allowed Files

- `web/app/api/mobile/v1/sync/push/**`
- `web/app/api/mobile/v1/workout-sessions/**`
- `web/src/server/services/sync/**`
- shared sync schemas
- route tests

### Must Not Change

- mobile syncService implementation yet
- plan publishing
- photos

### Tests First

- unauthenticated request returns 401
- valid session upsert succeeds
- repeated upsert is idempotent
- newer incoming workout session overwrites older stored row
- older incoming workout session does not overwrite newer stored row
- equal timestamp keeps stored row
- invalid session data returns 400 or 422
- delete scopes to authenticated user
- delete uses `deletedAt` plus latest `updatedAt`
- older delete tombstone does not overwrite newer stored row
- repeated delete succeeds

### Done

- push/delete route tests pass

## Slice 9 — Mobile Sync Client Adapter

### Goal

Introduce a mobile API client abstraction and switch `syncService` from Supabase to the Next.js REST API.

### Allowed Files

- `mobile/src/services/**`
- `mobile/src/stores/authStore.ts` only if token access is needed
- mobile sync tests
- shared domain imports if needed

### Must Not Change

- UI screens except wiring required by tests
- photo logic
- import API
- Supabase dependency removal

### Tests First

- sync no-ops when unauthenticated
- sync pushes unsynced sessions
- sync pulls published plans
- sync follows paginated pull while `hasMore` is true
- sync stops and reports an error if pagination loops or exceeds a safe page limit
- sync handles server tombstones
- sync records last synced timestamp
- sync stores structured error message on failure
- refresh failure clears remote tokens without deleting local workout data

### Done

- mobile sync tests pass
- `syncService` no longer calls `supabase.from`
- Supabase remains installed until other call sites are removed

## Slice 10 — Equipment Photo API

### Goal

Implement authenticated upload, list, download, and delete endpoints for equipment photos.

### Allowed Files

- `web/app/api/mobile/v1/photos/**`
- `web/src/server/storage/**`
- `web/src/server/services/photos/**`
- photo route tests
- shared photo schemas

### Must Not Change

- mobile photo hook yet
- sync service
- import service

### Tests First

- upload rejects unauthenticated request
- upload rejects non-JPEG file
- upload rejects invalid JPEG magic bytes
- upload rejects files over 5 MB
- upload stores under current user's folder
- upload uses stable server-derived path
- re-upload clears `deletedAt`
- list scopes to current user
- download returns JPEG bytes
- delete is idempotent
- delete sets `deletedAt` metadata and keeps physical file

### Done

- photo route tests pass
- storage path remains migration-compatible
- server never trusts client-supplied filesystem paths

## Slice 11 — Mobile Photo Client Adapter

### Goal

Switch `useEquipmentPhoto` from Supabase Storage to the new photo API client.

### Allowed Files

- `mobile/src/hooks/useEquipmentPhoto.ts`
- `mobile/src/hooks/useEquipmentPhoto.test.ts`
- `mobile/src/services/**`

### Must Not Change

- sync service
- import service
- admin/web files

### Tests First

- uploads through new API when authenticated
- skips remote upload when unauthenticated
- local save wins if upload fails
- removes through new API when authenticated
- restore lists and downloads through new API

### Done

- mobile equipment photo tests pass
- `useEquipmentPhoto` no longer imports `@/lib/supabase`
- uploaded files use stable server-derived paths only
- server rejects client-supplied filesystem paths

## Slice 12 — Admin AI Import

### Goal

Move the Supabase Edge Function behavior into an admin-only Next.js route handler and admin UI flow.

### Allowed Files

- `web/app/admin/**`
- `web/app/api/admin/import/extract-workout/**`
- `web/src/server/services/import/**`
- `packages/domain/**`
- route/component tests

### Must Not Change

- mobile runtime code
- Supabase function files
- plan store/import store

### Tests First

- rejects unauthenticated or non-admin requests
- rejects invalid image
- rejects non-JPEG or image over 5 MB
- calls Anthropic with server-only key
- parses valid JSON model output
- strips markdown fences
- normalizes categories
- returns 422 for malformed model output

### Done

- import route tests pass
- admin can import/extract workout data
- admin import UI route implemented at `/admin/import`
- admin import API route implemented at `/api/admin/import/extract-workout`
- import jobs store metadata only, not raw images or raw AI payloads
- no `/api/mobile/v1/import/extract-workout` endpoint is introduced

## Slice 13 — Remove Mobile AI Import Dependency

### Goal

Remove or disable mobile AI import so the mobile app stays simpler in v1.

### Allowed Files

- `mobile/src/services/importApi.ts`
- `mobile/src/services/importApi.test.ts`
- mobile screens/stores that expose AI import, only if needed to remove the feature path
- environment docs/examples if present

### Must Not Change

- Supabase function files
- sync service
- photo hook

### Tests First

- mobile no longer calls Supabase Edge Function `extract-workout`
- mobile no longer calls `/api/mobile/v1/import/extract-workout`
- remaining import/category helpers still pass if they are still used

### Done

- importApi tests pass
- mobile runtime has no AI import network call
- mobile import UI is removed or disabled if present
- `importApi` no longer references `EXPO_PUBLIC_SUPABASE_URL`

## Slice 14 — Supabase Migration Scripts

### Goal

Add export, validation, SQL generation, photo download, and import scripts for Supabase data.

### Allowed Files

- `scripts/migration/**`
- `web/src/server/db/**` only if script integration requires it
- `web/src/server/db/seeds/personal-seed.ts`
- `packages/domain/**`
- migration tests
- `.gitignore` for `.migration/`

### Must Not Change

- mobile runtime code under `mobile/`
- admin UI
- production deployment config

### Tests First

- validates good export artifact
- reports invalid plan payload with ID
- reports missing photo file
- dry-run performs no writes
- generated SQL preserves IDs in test database
- generated SQL can be applied to an empty migrated database

### Done

- dry-run command is documented
- `.migration/supabase-export/import-forja.sql` is generated from validated data
- export artifacts are ignored by Git
- personal dev seed is generated separately from `.migration/` and contains no secrets or live auth material
- personal seed command `pnpm --filter @forja/web db:seed:personal` is documented

## Slice 15 — Deployment

### Goal

Add VPS deployment config and backup scripts.

### Allowed Files

- deployment config files under `deploy/forja/`
- `web` Dockerfile/config
- backup scripts
- deployment docs

### Must Not Change

- mobile runtime code
- application behavior

### Tests First

- config validation if tooling exists
- backup script dry-run test
- backup retention test for deleting artifacts older than 14 days
- restore script test against a temporary database when practical

### Done

- Docker Compose/Portainer stack can start web and Postgres locally
- local compose override can expose PostgreSQL on `127.0.0.1` for development/tests
- Postgres service uses the PostgreSQL 18 image line
- `GET /api/health` is used as the web container healthcheck
- web Docker image uses the Node 24 LTS image line
- production Docker image can be built on the VPS via SSH from the repo checkout
- deployment docs describe pull, build, stack update, fix-forward recovery, and verification steps
- upload and database volumes are persistent
- `forja-web` can read/write `/data/uploads` as a non-root container user
- `forja-backup` service runs inside the Portainer stack
- backup/restore procedure is documented
- restore procedure can target a temporary verification database

## Slice 16 — Remove Supabase Runtime Dependency

### Goal

Remove Supabase runtime dependency after auth, sync, and photos have replacements, and mobile AI import has been removed or disabled.

### Allowed Files

- `mobile/src/lib/supabase.ts`
- `mobile/src/stores/authStore.ts`
- `mobile/src/app/auth/callback.tsx`
- package files
- tests affected by Supabase mocks
- docs/examples for environment variables

### Must Not Change

- unrelated UI behavior
- Supabase migration/export files
- historical docs unless explicitly necessary

### Tests First

- auth store uses new API client
- auth callback exchanges through new backend
- sign-out clears local session and calls new logout endpoint
- mobile has no AI import runtime network call
- no source file imports `@supabase/supabase-js`

### Done

- `rg "@supabase|EXPO_PUBLIC_SUPABASE|from\\('plans'\\)|from\\('workout_sessions'\\)|storage\\.from" mobile/src web packages` has no runtime call sites
- package dependency is removed
- mobile tests pass
- typecheck passes
