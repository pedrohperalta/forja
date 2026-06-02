# Supabase to Next.js Refactor — Validation Checklist

Use this file as the final acceptance checklist and as the standard checkpoint after major slices.

## Automated Checks

Run from the repo root for workspace-level checks.

```sh
node --version
pnpm --version
pnpm test
pnpm typecheck
pnpm lint
```

Run for the mobile app:

```sh
pnpm --filter @forja/mobile test
pnpm --filter @forja/mobile typecheck
pnpm --filter @forja/mobile lint
```

Run for the web app:

```sh
pnpm --filter @forja/web test
pnpm --filter @forja/web typecheck
pnpm --filter @forja/web build
```

Run for the shared package:

```sh
pnpm --filter @forja/domain test
pnpm --filter @forja/domain typecheck
```

Search for remaining Supabase runtime usage:

```sh
rg "@supabase|EXPO_PUBLIC_SUPABASE|supabase\\.from|storage\\.from|functions/v1|extract-workout" mobile/src web packages
```

## Autonomous Implementation Readiness

- [ ] `07-autonomous-runbook.md` exists and is up to date.
- [ ] `08-codex-prompts.md` exists and has one prompt per implementation slice.
- [ ] Implementation branch is `track/supabase-to-next`.
- [ ] Codex starts each slice with `git status --short`.
- [ ] Codex implements one slice at a time unless the owner explicitly asks for a larger batch.
- [ ] Codex stops before final cutover unless the owner explicitly approves it.

Allowed matches after migration:

- historical docs
- migration scripts
- archived Supabase function files kept temporarily

Disallowed matches after migration:

- mobile runtime source under `mobile/src/`
- web runtime source under `web/`
- shared package source under `packages/domain`

The archived Supabase Edge Function may remain outside runtime paths only if clearly documented as historical reference.

## Mobile Manual Smoke Test

- [ ] Fresh install opens without backend errors.
- [ ] Mobile login is optional.
- [ ] Mobile works from local MMKV data without login.
- [ ] User can sign in with Google.
- [ ] User can sign out.
- [ ] Mobile logout does not delete local workout history.
- [ ] Refresh-token 401 clears remote session but keeps local workout data.
- [ ] App can pull published plans.
- [ ] App can complete paginated sync pulls until `hasMore` is false.
- [ ] App can start a workout from a downloaded plan.
- [ ] App can complete workout offline.
- [ ] App syncs workout history after reconnecting.
- [ ] App handles sync failure with existing UI state.
- [ ] App can upload an equipment photo.
- [ ] App can delete an equipment photo.
- [ ] App can restore equipment photos after local state reset.
- [ ] App has no AI import entry point in v1.

## Admin Manual Smoke Test

- [ ] Admin route requires login.
- [ ] User can sign in with Google.
- [ ] User can view plans list.
- [ ] User can create a plan draft.
- [ ] User can edit exercises in a draft.
- [ ] User can publish a plan.
- [ ] Published plan appears in mobile pull response.
- [ ] Draft-only changes do not appear in mobile pull response.
- [ ] User can archive/delete a plan.
- [ ] Archived/deleted plan appears as tombstone in mobile sync.
- [ ] User can run AI import from `/admin/import`.
- [ ] Imported AI result can be accepted into a draft flow.
- [ ] AI import does not persist raw image or raw AI payload.

## API Smoke Test

- [ ] `GET /api/health` returns `200`.
- [ ] `GET /api/admin/auth/google/start` redirects to Google OAuth.
- [ ] `GET /api/auth/google/callback` handles admin and mobile OAuth flows.
- [ ] `POST /api/admin/auth/logout` revokes admin session and clears cookie.
- [ ] `POST /api/mobile/v1/auth/google/start` returns OAuth URL.
- [ ] `POST /api/mobile/v1/auth/refresh` rotates refresh token.
- [ ] `GET /api/mobile/v1/auth/me` returns current user.
- [ ] `GET /api/mobile/v1/sync/pull` returns plans and cursor.
- [ ] Mobile sync never returns draft-only plan changes.
- [ ] Mobile sync orders changes deterministically by `(changedAt, id)`.
- [ ] Mobile sync pull caps responses at 500 changed records and returns `hasMore`.
- [ ] Mobile sync client stops after 20 pull pages and reports an error.
- [ ] `POST /api/mobile/v1/sync/push` accepts workout sessions.
- [ ] `POST /api/mobile/v1/sync/push` resolves workout sessions by latest `updatedAt`.
- [ ] Older pushed workout sessions do not overwrite newer stored rows.
- [ ] Workout session deletion uses `deletedAt` plus latest `updatedAt`.
- [ ] Older workout session delete tombstones do not overwrite newer stored rows.
- [ ] Plan and workout session tombstones are retained indefinitely in v1.
- [ ] `PUT /api/mobile/v1/photos/equipment/:exerciseId` uploads JPEG.
- [ ] Photo upload validates JPEG content type and magic bytes.
- [ ] Photo upload rejects files over 5 MB.
- [ ] Server does not reprocess/transcode photos in v1.
- [ ] `GET /api/mobile/v1/photos/equipment` lists photos.
- [ ] `GET /api/mobile/v1/photos/equipment/:exerciseId/download` returns JPEG.
- [ ] `DELETE /api/mobile/v1/photos/equipment/:exerciseId` deletes photo.
- [ ] Photo deletion sets `deletedAt` metadata and keeps the physical file in v1.
- [ ] Re-uploading a deleted photo clears `deletedAt` and overwrites the stable file path.
- [ ] No `/api/mobile/v1/import/extract-workout` endpoint exists in v1.
- [ ] `POST /api/admin/import/extract-workout` returns extracted workout for admin.
- [ ] Admin AI import rejects non-JPEG or image over 5 MB.
- [ ] Admin AI import stores job metadata but not raw images or raw AI payloads.
- [ ] Import job status is limited to `pending`, `completed`, `failed`.
- [ ] Import job errors are sanitized.
- [ ] AI extracted results persist only after admin-accepted create/update flow.

## Migration Validation

- [ ] Codex exposes Supabase MCP tools after restart/reload.
- [ ] Supabase MCP authentication is completed through the browser.
- [ ] Supabase MCP token exists in macOS Keychain item `codex-supabase-mcp`.
- [ ] Supabase MCP can list tables for project `hqvfuwvoureadcwrlkwn`.
- [ ] Supabase users export exists.
- [ ] Supabase plans export exists.
- [ ] Supabase workout sessions export exists.
- [ ] Supabase equipment photos export exists.
- [ ] Supabase MCP export was used, or fallback service-role export was documented.
- [ ] Export validation passes.
- [ ] `.migration/supabase-export/import-forja.sql` is generated.
- [ ] Generated SQL is reviewed locally.
- [ ] Generated SQL runs inside a single transaction.
- [ ] Raw `.migration/` exports are not committed.
- [ ] Any committed real-data dev seed is intentional, reviewed, and contains no secrets or live auth material.
- [ ] Personal seed lives at `web/src/server/db/seeds/personal-seed.ts`.
- [ ] Personal seed command is `pnpm --filter @forja/web db:seed:personal`.
- [ ] Admin behavior has server/component coverage where practical.
- [ ] Deployment docs include a manual admin smoke test.
- [ ] Playwright E2E is not required for v1.
- [ ] Admin route map matches v1 scope: `/admin`, `/admin/login`, `/admin/plans`, `/admin/plans/new`, `/admin/plans/[planId]`, `/admin/import`.
- [ ] Admin v1 does not include dashboard/statistics/settings/user-management routes.
- [ ] Admin plan editor is structured and validates through `packages/domain`.
- [ ] Raw JSON editing is not the primary admin workflow and cannot bypass validation.
- [ ] Publishing creates immutable plan revisions.
- [ ] Mobile sees only latest published revision per active plan.
- [ ] Archiving a plan creates/updates a tombstone.
- [ ] Dry-run import reports expected counts.
- [ ] Imported user IDs match Supabase user IDs.
- [ ] Imported plan IDs match Supabase plan IDs.
- [ ] Imported workout session IDs match Supabase workout session IDs.
- [ ] Imported photo paths exist on disk.
- [ ] Non-deleted plans have published revisions.
- [ ] Deleted/archived plans have tombstones.
- [ ] Production import counts match `.migration/supabase-export/summary.json`.

## Deployment Validation

- [ ] VPS has Docker and Compose available.
- [ ] Local, VPS, and Docker use Node.js 24 LTS.
- [ ] `.nvmrc` contains `24`.
- [ ] Root `package.json` declares `engines.node` as `>=24 <25`.
- [ ] EAS workflow paths are updated for `mobile/` without changing trigger behavior.
- [ ] Web Dockerfile uses the Node 24 LTS image line.
- [ ] `web` uses Next.js standalone output.
- [ ] Production container runs the generated standalone server on port `3000`.
- [ ] Postgres service uses the PostgreSQL 18 image line.
- [ ] VPS can access the repository over SSH or HTTPS.
- [ ] VPS repository checkout exists at `/root/projects/forja`.
- [ ] Git commands account for `safe.directory=/root/projects/forja`.
- [ ] Deployment preflight checks for tracked or conflicting local changes before pulling.
- [ ] Deployment docs include the SSH-based build flow.
- [ ] Deployment docs describe fix-forward recovery instead of formal rollback.
- [ ] Production Docker image builds successfully on the VPS.
- [ ] Portainer stack is named `forja`.
- [ ] Deployment artifacts live under `deploy/forja/`.
- [ ] `deploy/forja/compose.yml` exists.
- [ ] `deploy/forja/compose.local.yml` exists for local-only Postgres port exposure.
- [ ] `deploy/forja/.env.example` documents required production variables.
- [ ] Real production `.env` files are ignored and not committed.
- [ ] Production secrets are set in Portainer or a VPS-local env file.
- [ ] Secret generation docs use `openssl rand -base64 48` without committing real values.
- [ ] Portainer stack file is ready to import or update.
- [ ] Cloudflare DNS for `forja.phperalta.me` points to the VPS.
- [ ] Future `forja.p3ralta.dev` route is documented but disabled until DNS exists.
- [ ] `forja-web` is attached to external Docker network `root_default`.
- [ ] Traefik routes `Host(`forja.phperalta.me`)` to the Next.js service.
- [ ] Traefik applies the Cloudflare-only middleware to the Forja router in production.
- [ ] Direct VPS IP access is not a supported production client path.
- [ ] Traefik service port is set to `3000`.
- [ ] Traefik cert resolver is `mytlschallenge`.
- [ ] Google OAuth client `forja-next-web` exists.
- [ ] `forja-next-web` includes production and localhost redirect URIs.
- [ ] OAuth state is signed with `FORJA_OAUTH_STATE_SECRET` and expires after 10 minutes.
- [ ] OAuth state distinguishes admin and mobile login flows.
- [ ] OAuth callback rejects invalid, expired, or tampered state.
- [ ] Expo app scheme is `forja`.
- [ ] Mobile OAuth callback is exactly `forja://auth/callback`.
- [ ] `FORJA_ALLOWED_USER_EMAILS` is set to `pedrohperalta@gmail.com`.
- [ ] `FORJA_ADMIN_EMAILS` is set to `pedrohperalta@gmail.com`.
- [ ] Mobile/admin login rejects Google accounts outside `FORJA_ALLOWED_USER_EMAILS`.
- [ ] `/admin` rejects authenticated Google users outside the allowlist.
- [ ] Mobile access tokens expire after 15 minutes.
- [ ] Mobile access tokens are JWTs signed with HS256.
- [ ] Mobile refresh tokens expire after 30 days and rotate on refresh.
- [ ] Refresh token reuse revokes the full token family.
- [ ] Opaque token hashes use HMAC-SHA256 with the appropriate server secret.
- [ ] Admin session cookies expire after 7 days.
- [ ] Admin sessions use `forja_admin_session` HTTP-only cookie.
- [ ] Admin session tokens are hashed in `admin_sessions`.
- [ ] Admin sessions are not stored in `refresh_tokens`.
- [ ] One-time mobile auth codes expire after 5 minutes.
- [ ] One-time mobile auth codes are stored hashed and marked used after exchange.
- [ ] Admin routes are same-origin only.
- [ ] Mobile API routes do not enable broad browser CORS.
- [ ] Auth endpoints rate-limit at 10 requests per minute per IP.
- [ ] AI import endpoints rate-limit at 5 requests per minute per authenticated user.
- [ ] Other authenticated endpoints rate-limit at 120 requests per minute per authenticated user.
- [ ] Rate-limit responses use HTTP `429` and the standard API error shape.
- [ ] API errors use standard error codes from `02-api-contract.md`.
- [ ] Rate limiting uses effective client IP from trusted reverse proxy headers in production.
- [ ] App writes structured JSON logs to stdout/stderr.
- [ ] Logs do not include tokens, cookies, authorization headers, OAuth secrets, or raw AI import payloads.
- [ ] API/admin responses include `x-request-id`.
- [ ] Structured logs include the effective request ID.
- [ ] Existing Supabase IDs are preserved during migration.
- [ ] New server-side IDs are generated as UUID v4.
- [ ] Database timestamps use `timestamptz`.
- [ ] API timestamps are UTC ISO strings.
- [ ] UI date/time formatting uses `America/Sao_Paulo` where local presentation is needed.
- [ ] Repositories update `updated_at` explicitly and preserve imported timestamps.
- [ ] Mobile API endpoints live under `/api/mobile/v1`.
- [ ] Backwards-compatible mobile API additions stay in v1.
- [ ] Sync pull uses stateless signed cursors.
- [ ] No `sync_cursors` table is created in v1.
- [ ] Sync cursors are signed with `FORJA_SYNC_CURSOR_SECRET`.
- [ ] Invalid or tampered sync cursors return HTTP `400`.
- [ ] Reverse proxy serves HTTPS.
- [ ] `GET /api/health` returns `{ "ok": true }` over HTTPS.
- [ ] `forja-web` Docker healthcheck uses `GET /api/health`.
- [ ] Drizzle migrations are versioned in the repo.
- [ ] Migrations enable PostgreSQL `pgcrypto`.
- [ ] `pnpm --filter @forja/web db:migrate` runs successfully against production `DATABASE_URL`.
- [ ] `web` service starts from the image built on the VPS.
- [ ] `forja-web` runs as a non-root container user.
- [ ] PostgreSQL has no public published port.
- [ ] `forja-web` reaches PostgreSQL over the private stack network.
- [ ] Integration tests use `TEST_DATABASE_URL`, never production `DATABASE_URL`.
- [ ] Integration tests refuse to run unless database name is `forja_test`.
- [ ] `forja_postgres_data` volume persists restart.
- [ ] `forja_uploads` volume persists restart.
- [ ] `forja-web` can read/write `/data/uploads`.
- [ ] `forja_backups` volume stores generated backup artifacts.
- [ ] `forja-backup` service runs inside the Portainer stack.
- [ ] Database backup script creates restorable dump.
- [ ] Upload backup script creates restorable archive.
- [ ] Restore procedure can restore database into a temporary verification database.
- [ ] Backup schedule runs daily at 03:30 on the VPS/server timezone.
- [ ] Backup retention keeps the last 14 days.
- [ ] Environment variables are documented and set.
- [ ] Server env vars are validated with server-only Zod schema.
- [ ] Missing required production env vars fail fast before serving requests.
- [ ] Server-only secrets are not exposed to the mobile bundle.
- [ ] Mobile bundle only contains `EXPO_PUBLIC_FORJA_API_URL` from the new backend config.
- [ ] API/domain schemas are shared through `@forja/domain`, not duplicated in web/mobile runtime code.

## Final Cutover Criteria

Cutover is allowed only when all are true:

- [ ] mobile auth works against Next.js backend
- [ ] mobile sync works against Next.js backend
- [ ] mobile photo backup works against Next.js backend
- [ ] mobile has no AI import runtime dependency
- [ ] admin AI import works against Next.js backend
- [ ] admin can publish a plan consumed by mobile
- [ ] migration dry-run passes
- [ ] production backup exists
- [ ] no mobile runtime Supabase dependency remains
- [ ] fix-forward recovery and data-restore procedures are documented

## Suggested Commit Boundaries

Use small commits with Conventional Commit messages:

```text
chore(repo): move expo app into mobile workspace
chore(domain): add shared schemas for backend migration
feat(web): scaffold next admin and health route
feat(web): add postgres repositories
feat(web): add mobile auth endpoints
feat(web): add plan publishing flow
feat(sync): add mobile sync api client
feat(web): add equipment photo api
feat(import): add admin workout extraction
refactor(mobile): remove ai import runtime path
chore(migration): add supabase export and import scripts
chore(deploy): add vps docker deployment
refactor(mobile): remove supabase runtime client
```
