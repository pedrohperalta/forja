# Supabase to Next.js Refactor — Decisions

This file contains execution defaults. Treat them as binding unless a later task explicitly changes them with a documented reason.

## D1. Monorepo Layout

Decision: move the existing Expo app into `mobile/` and add `web/` and `packages/domain/`.

```text
mobile/
web/
packages/domain/
```

Rationale:

- makes the monorepo shape explicit before the web app and shared package are introduced
- avoids teaching later tasks root-level paths that will be invalid after the move
- keeps mobile, web, and shared domain boundaries clear

Rule:

- perform the mobile move as its own mechanical slice before feature work
- do not mix behavior changes into the move

Package manager:

- migrate the monorepo to `pnpm` workspaces during Slice 0
- root workspace file: `pnpm-workspace.yaml`
- root `package.json` should declare `packageManager`
- remove `package-lock.json` after `pnpm-lock.yaml` is generated and validated
- workspace package names should be `@forja/mobile`, `@forja/web`, and `@forja/domain`
- verify Expo/EAS, Jest, TypeScript, lint, and Next.js build under `pnpm` before considering the migration complete

Expo/EAS workflow policy:

- keep existing EAS behavior intact after moving the app into `mobile/`
- update EAS workflow paths only as part of Slice 0
- push to `main` remains owner-controlled because it triggers preview builds
- mobile production builds use only `EXPO_PUBLIC_FORJA_API_URL` from the new backend after cutover

## D2. Full-Stack Framework

Decision: use Next.js App Router in `web/`.

Rationale:

- serves admin UI and API from one deployable app
- works well for self-hosting on a VPS
- keeps admin server logic close to admin UI

Rule:

- mobile uses Route Handlers only, never Server Actions.

Self-hosting build:

- `web` uses Next.js standalone output for Docker deployment
- Docker image runs the standalone server on port `3000`
- production build command is `pnpm --filter @forja/web build`
- production start command inside the container runs the generated standalone server, not `next dev`

Node runtime:

- use Node.js 24 LTS (`Krypton`) for local development, VPS builds, and Docker images
- latest LTS patch verified during planning: `v24.15.0` on 2026-05-18
- commit `.nvmrc` with `24`
- set root `package.json` `engines.node` to `>=24 <25`
- Dockerfiles should use the Node 24 LTS image line, for example `node:24-alpine` unless a dependency requires Debian-based images

## D3. Database

Decision: use PostgreSQL.

Rationale:

- matches Supabase's current underlying database model
- reliable for sync metadata, JSON payloads, and future admin workflows
- easy to run on Hostinger VPS with Docker

Version:

- use PostgreSQL 18 for the self-hosted database
- latest stable minor verified during planning: `18.4` on 2026-05-18
- Docker image line: `postgres:18-alpine`, unless a future extension requires a Debian-based image
- keep the container image on the latest available PostgreSQL 18 minor for security and bugfix updates
- enable `pgcrypto` in schema migrations for `gen_random_uuid()`

## D4. ORM

Decision: use Drizzle.

Rationale:

- lightweight runtime
- explicit SQL-shaped schema
- good fit for route handlers and service-layer tests
- avoids heavier generation steps during small iterations

Migration deployment policy:

- database schema migrations are committed to the repository
- deploys run `pnpm --filter @forja/web db:migrate` before final production validation
- migration commands use the production `DATABASE_URL` from Portainer/VPS environment configuration
- migrations should be idempotent through Drizzle's migration tracking table, not by ad hoc checks in application code

Change rule:

- do not switch away from Drizzle during autonomous implementation without explicit owner approval and a docs update first

## D5. Auth Strategy

Decision: custom Google OAuth plus first-party access/refresh tokens.

Rationale:

- mobile needs bearer tokens and refresh token rotation
- admin needs secure HTTP-only cookie sessions
- preserving Supabase user IDs is easier with explicit account linking
- avoids coupling mobile auth to a web-session library abstraction

Security requirements:

- access tokens are short-lived
- refresh tokens are random opaque tokens
- refresh tokens are hashed before storage
- admin cookies are HTTP-only, secure in production, and same-site
- all token validation is server-side
- admin access is restricted by an email allowlist
- admin sessions use an opaque HTTP-only cookie backed by a hashed server-side `admin_sessions` row
- do not store admin session tokens in the mobile `refresh_tokens` table
- all Google logins are restricted to `FORJA_ALLOWED_USER_EMAILS` in v1

Token cryptography:

- mobile access tokens are JWTs signed with HS256 using `FORJA_ACCESS_TOKEN_SECRET`
- mobile refresh tokens are opaque random tokens; store HMAC-SHA256 token hash using `FORJA_REFRESH_TOKEN_SECRET`
- admin session tokens are opaque random tokens; store HMAC-SHA256 session hash using `FORJA_ADMIN_SESSION_SECRET`
- one-time mobile auth codes are opaque random tokens; store HMAC-SHA256 code hash using `FORJA_AUTH_CODE_SECRET`
- if a rotated/revoked refresh token is reused, revoke the entire refresh token family

Google OAuth setup:

- reuse the existing Google Cloud project currently used by Supabase
- keep the existing `forja-web` OAuth client untouched for Supabase until final cutover
- keep the existing `forja-android` OAuth client available, but do not require it for the v1 self-hosted auth flow
- create a new Web OAuth client named `forja-next-web`
- use a signed OAuth `state` value to distinguish admin and mobile login flows

`forja-next-web` authorized JavaScript origins:

```text
https://forja.phperalta.me
http://localhost:3000
```

`forja-next-web` authorized redirect URIs:

```text
https://forja.phperalta.me/api/auth/google/callback
http://localhost:3000/api/auth/google/callback
```

Mobile auth flow:

```text
Mobile app
  -> GET/POST /api/mobile/v1/auth/google/start
  -> opens Google OAuth URL generated by backend with forja-next-web
Google
  -> redirects to /api/auth/google/callback
Backend
  -> redirects to forja://auth/callback?code=<one-time-forja-code>
Mobile app
  -> POST /api/mobile/v1/auth/google/exchange
  -> receives Forja access/refresh tokens
```

This keeps Google OAuth callback handling server-owned and avoids requiring Google to redirect directly to the mobile deep link in v1.

OAuth state policy:

- OAuth state is stateless, opaque to clients, and signed with `FORJA_OAUTH_STATE_SECRET`
- state payload includes flow type (`admin` or `mobile`), redirect target, nonce, and expiration
- state expires after 10 minutes
- invalid, expired, or tampered state returns an authentication error and does not create sessions/tokens
- mobile redirect targets must match the allowed `forja://auth/callback` scheme
- admin redirect targets must remain same-origin under `FORJA_PUBLIC_URL`

Mobile deep link:

- Expo app scheme: `forja`
- auth callback: `forja://auth/callback`
- backend must reject any mobile OAuth redirect URI that does not exactly match this callback in v1

Admin authorization:

- `FORJA_ALLOWED_USER_EMAILS` contains the comma-separated list of Google account emails allowed to sign in at all
- `FORJA_ADMIN_EMAILS` contains the comma-separated list of Google account emails allowed to access `/admin`
- v1 allowed-user list contains only `pedrohperalta@gmail.com`
- v1 allowlist contains only `pedrohperalta@gmail.com`
- Google authentication alone is not sufficient for admin access; the authenticated email must be allowlisted
- denied admin access should show a generic unauthorized state and must not create elevated permissions

Token and session TTLs:

- mobile access token: 15 minutes
- mobile refresh token: 30 days with rotation
- admin session cookie: 7 days
- one-time mobile auth code: 5 minutes
- one-time mobile auth codes are stored hashed in PostgreSQL and marked used after exchange

Admin cookie policy:

- cookie name: `forja_admin_session`
- `HttpOnly`
- `Secure` in production
- `SameSite=Lax`
- path `/`
- value is an opaque random token; database stores only its hash

CORS policy:

- `/admin` is same-origin only
- `/api/mobile/v1` does not enable broad browser CORS in v1
- native mobile clients use HTTPS requests directly and do not require browser CORS
- `/api/health` is public
- future browser API clients must be added through an explicit origin allowlist

Rate limiting policy:

- v1 uses simple app-level rate limiting without Redis
- auth endpoints: 10 requests per minute per IP
- AI import endpoints: 5 requests per minute per authenticated user
- other authenticated API endpoints: 120 requests per minute per authenticated user
- rate limit responses use the standard API error shape with HTTP `429`
- rate limiting should use the effective client IP from trusted reverse proxy headers in production
- production requests are expected to arrive through Cloudflare/Traefik; direct-IP access is not a supported client path

Logging policy:

- write structured JSON logs to container stdout/stderr
- do not add an external logging service for v1
- never log access tokens, refresh tokens, cookies, authorization headers, OAuth secrets, or raw AI import payloads
- log request IDs, route names, status codes, durations, and sanitized error codes/messages
- include enough operational context for deploy troubleshooting without exposing personal workout data unnecessarily

Request ID policy:

- accept an incoming `x-request-id` header when present
- generate a request ID when the client did not provide one
- return the effective `x-request-id` header on API/admin responses
- include the effective request ID in structured logs and sanitized error responses where useful

ID policy:

- preserve existing Supabase IDs during migration
- generate new server-side record IDs as UUID v4
- plan IDs remain `text` to preserve existing plan identifiers; new plan revision IDs use UUID v4
- avoid introducing ULID/CUID unless a later ordering or interoperability requirement justifies it

Timezone policy:

- store timestamps in PostgreSQL as `timestamptz`
- API timestamps use UTC ISO strings
- UI formats dates/times for `America/Sao_Paulo` when a local presentation timezone is needed
- never store localized date strings as source-of-truth data

Mobile API versioning policy:

- all mobile endpoints live under `/api/mobile/v1`
- backwards-compatible additions stay in v1
- introduce `/api/mobile/v2` only for breaking contract changes
- admin routes are not part of the mobile API version contract

Sync cursor policy:

- v1 uses stateless signed cursors for `GET /sync/pull`
- do not create a `sync_cursors` table in v1
- cursor payload is opaque to clients and signed with `FORJA_SYNC_CURSOR_SECRET`
- cursor format is base64url-encoded JSON payload plus HMAC SHA-256 signature
- cursor payload includes `lastChangedAt` and a stable tie-breaker such as `lastId`
- sync ordering is by `(changedAt, id)` ascending to make cursor pagination deterministic
- changedAt for plans is the published revision timestamp; changedAt for tombstones/deleted sessions is `deletedAt`; changedAt for workout sessions/photos is `updatedAt`
- sync pull returns at most 500 changed records per response in v1
- when more changes remain, response includes a cursor for the next page
- mobile client stops a single pull cycle after 20 pages and reports sync error to avoid infinite loops
- invalid or tampered cursors return HTTP `400` with the standard error shape

## D6. Shared Contracts

Decision: create `packages/domain` for shared Zod schemas, constants, branded IDs, and API request/response types.

Rationale:

- mobile, web routes, migration scripts, and tests validate the same contracts
- reduces schema drift during the refactor

Rule:

- domain package must not import React, React Native, Expo, Next.js, Node-only APIs, or database clients.
- API request/response schemas live in `@forja/domain` and are reused by web route handlers, mobile clients, and migration scripts
- do not duplicate domain Zod schemas inside `mobile/` or `web/`

## D7. Plan Ownership

Decision: backend is canonical for admin-authored plan definitions. Mobile remains canonical for unsynced workout activity until push succeeds.

Implications:

- admin edits drafts
- admin publishes immutable plan revisions
- mobile downloads published revisions
- workout sessions reference the plan and exercise IDs used at workout time

## D8. Plan Drafts And Publishing

Decision: support one mutable draft and one latest published revision per plan in v1.

Rationale:

- enough for browser management and mobile download
- avoids building full version history before it is needed

Future:

- full revision history can be added later without changing the mobile API if published revisions already have stable IDs/cursors.

Publishing rules:

- draft changes are admin-only and never appear in mobile sync
- publishing creates an immutable `plan_revisions` row with the next `revision_number`
- mobile sync returns only the latest published revision per active plan
- archiving a plan creates/updates `plan_tombstones` and removes the plan from active admin/mobile lists
- unarchiving is out of scope for v1; create a new plan instead if needed

## D9. Sync Strategy

Decision: use cursor-based sync for mobile pull and idempotent upserts for mobile push.

Rules:

- server returns a new cursor after every pull
- mobile can call push multiple times with the same entities safely
- deleted server-owned plans are represented as tombstones
- workout sessions are user-owned and can be upserted by client-generated IDs
- workout session conflicts resolve automatically by latest `updatedAt` timestamp
- if an incoming workout session is older than or equal to the stored version, keep the stored version and report it as skipped/current rather than returning a manual conflict
- if timestamps are exactly equal, the stored server version wins as the deterministic tie-breaker
- workout session deletion is represented as a tombstone with `deletedAt` and a newer `updatedAt`
- deletion only wins if its `updatedAt` is newer than the stored row
- keep plan and workout session tombstones indefinitely in v1 because data volume is small and this avoids old-device sync edge cases

## D10. File Storage

Decision: store equipment photos on VPS disk in a persistent Docker volume.

Rationale:

- simplest self-hosted replacement for Supabase Storage
- enough for current expected scale
- easy to back up with database dumps
- deleting a photo sets `deletedAt` on metadata and keeps the physical file in v1
- uploading a new photo for the same `exerciseId` overwrites the stable file path and clears `deletedAt` on metadata
- validate uploads with `Content-Type: image/jpeg` plus JPEG magic bytes
- do not reprocess or transcode images on the server in v1

Path compatibility:

```text
equipment-photos/{userId}/{exerciseId}.jpg
```

Upload volume permissions:

- runtime upload root is `UPLOADS_DIR=/data/uploads`
- `forja-web` container must run as a non-root user
- Dockerfile/entrypoint must ensure the non-root app user can read/write `/data/uploads`
- uploaded files use stable relative paths only; never trust client-supplied filesystem paths

## D11. API URL

Decision: mobile reads the backend base URL from:

```text
EXPO_PUBLIC_FORJA_API_URL
```

Primary production URL:

```text
FORJA_PUBLIC_URL=https://forja.phperalta.me
EXPO_PUBLIC_FORJA_API_URL=https://forja.phperalta.me
```

Reserved future alias:

```text
https://forja.p3ralta.dev
```

Domain rules:

- `forja.phperalta.me` is the primary domain for the first deployment
- admin lives at `https://forja.phperalta.me/admin`
- mobile API lives under `https://forja.phperalta.me/api/mobile/v1`
- `forja.p3ralta.dev` is reserved as a future alias or future primary domain after DNS/Cloudflare setup
- deployment config may document the future `forja.p3ralta.dev` Traefik host rule, but it should stay disabled or commented until DNS is configured in Cloudflare
- Traefik routes the primary host to the Next.js `web` service

Supabase variables must be removed after migration:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

## D12. Deployment

Decision: VPS deployment uses a Portainer-managed stack.

Build strategy: build the production Docker image on the VPS over SSH from a checked-out copy of this repository.

VPS repository checkout:

```text
/root/projects/forja
```

The checkout currently points to:

```text
origin git@github.com:pedrohperalta/forja.git
branch main
```

Because the checkout is under `/root` but owned by `dockeradmin`, root Git commands must either pass the safe-directory override or configure it once:

```sh
git -c safe.directory=/root/projects/forja status
```

Deployment automation must run a preflight `git status` and must not delete or overwrite local untracked files automatically. At planning time, the VPS checkout contained local untracked APK build helper files (`build-apk.Dockerfile`, `build-apk.sh`).

Implementation:

- place VPS/Portainer deployment artifacts under `deploy/forja/`
- provide Docker Compose-compatible stack files that can be pasted/imported into Portainer
- run the Next.js app and PostgreSQL in the same Portainer stack
- document the SSH-based deploy flow: connect to the VPS, pull the target branch/tag, build the Docker image on the server, and update/restart the Portainer stack
- avoid a container registry for v1; GHCR or another registry can be introduced later if deployments become frequent or need CI automation
- keep upload, database, and backup data in persistent volumes
- use the existing VPS Docker/Portainer setup rather than requiring a separate deployment tool
- attach the public `web` service to the existing external Docker network `root_default`, because the Traefik container runs there
- use a private stack network for `web` to reach `postgres`
- do not publish the PostgreSQL port publicly; PostgreSQL is reachable only on the private stack network and via Docker/Portainer maintenance commands

Services:

- Portainer stack: `forja`
- `forja-web`
- `forja-postgres`
- `forja-backup`

Volumes:

- `forja_postgres_data`
- `forja_uploads`
- `forja_backups`

Database names:

```text
POSTGRES_DB=forja
POSTGRES_USER=forja
TEST_POSTGRES_DB=forja_test
```

Production connection inside the stack:

```text
DATABASE_URL=postgres://forja:<secret>@postgres:5432/forja
```

Local/test connection should target a separate `forja_test` database when integration tests need PostgreSQL.

Deployment files:

```text
deploy/forja/compose.yml
deploy/forja/compose.local.yml
deploy/forja/.env.example
deploy/forja/README.md
deploy/forja/scripts/backup-database.sh
deploy/forja/scripts/backup-uploads.sh
deploy/forja/scripts/restore-database.sh
```

Local database policy:

- production `compose.yml` does not publish PostgreSQL publicly
- local development may use `deploy/forja/compose.local.yml` to expose PostgreSQL on `127.0.0.1`
- local app uses `DATABASE_URL` for development and `TEST_DATABASE_URL` for integration tests
- test database name is `forja_test`
- repository/service integration tests must not target production `DATABASE_URL`
- repository tests must require `TEST_DATABASE_URL` and refuse to run against a database whose name is not `forja_test`
- tests should clean data deterministically between cases, preferably with transactions or explicit truncation of app tables

Production secrets policy:

- commit `deploy/forja/.env.example` with variable names and safe placeholder values only
- never commit a real `.env` file or production secret values
- store production values in Portainer stack environment variables or a VPS-local `.env` file
- keep server-only secrets out of Expo public environment variables
- document how to rotate secrets without publishing them in the repository
- generate local/production random secrets with `openssl rand -base64 48`
- do not generate or print real production secret values in committed docs

Development seed data policy:

- real workout data may be used for dev seeds/fixtures because the app has one owner/user
- committed seed artifacts must be intentional and reviewed, not raw `.migration/` exports
- personal seed implementation lives at `web/src/server/db/seeds/personal-seed.ts`
- personal seed command is `pnpm --filter @forja/web db:seed:personal`
- implement the personal seed as part of the migration/tooling work
- never commit secrets, OAuth tokens, refresh tokens, cookies, service-role keys, API keys, or real `.env` files
- if the project becomes multi-user or public-data-sensitive later, replace real seeds with synthetic fixtures

Admin E2E policy:

- v1 does not require a full Playwright E2E suite for admin
- admin behavior should be covered by server, route handler, repository, and component tests where practical
- deployment docs must include a manual admin smoke test
- Playwright can be introduced later when the admin UI has enough workflow surface to justify it

Rollback policy:

- no formal rollback flow is required for v1
- if the app deployment breaks, fix forward with a new commit, pull it on the VPS, rebuild, and restart the stack
- database and uploads backups are still required for data-loss recovery, but not as a routine app rollback mechanism

Traefik conventions observed on the VPS:

```yaml
labels:
  traefik.enable: "true"
  traefik.docker.network: "root_default"
  traefik.http.routers.forja.entrypoints: "web,websecure"
  traefik.http.routers.forja.rule: "Host(`forja.phperalta.me`)"
  traefik.http.routers.forja.tls: "true"
  traefik.http.routers.forja.tls.certresolver: "mytlschallenge"
  traefik.http.services.forja.loadbalancer.server.port: "3000"
```

Cloudflare-only middleware convention exists on the VPS and should be reused for Forja:

```yaml
traefik.http.middlewares.cf-only.ipallowlist.sourcerange: "<Cloudflare IP ranges>"
traefik.http.routers.forja.middlewares: "cf-only@docker"
```

Use the Cloudflare-only middleware for the Forja admin/API in production. Since mobile traffic goes through the public Cloudflare hostname, it should still be allowed. Direct VPS IP access is not part of the supported production path.

Backup policy:

- backups run from the `forja-backup` service inside the Portainer stack
- daily PostgreSQL backup with `pg_dump`
- daily uploads archive as `.tar.gz`
- run backups daily at 03:30 on the VPS/server timezone
- write backup artifacts to `forja_backups`
- retain the last 14 days
- document local restore steps
- restore procedure must support restoring into a temporary database for verification
- external object storage is deferred and not required for v1

## D13. Migration

Decision: migrate everything at the end in one cutover.

Rationale:

- this is a personal project with one user
- feature-by-feature production migration would add coordination cost without much benefit
- Supabase can remain intact until the final cutover is verified

Migration must preserve IDs.

Preserve:

- Supabase `auth.users.id` as new `users.id`
- plan IDs
- workout session IDs
- existing timestamps
- equipment photo paths

Migration must support dry-run mode before production import.

Preferred data access:

- use the Supabase MCP when available for export/introspection
- fall back to explicit scripts and Supabase service-role access if MCP access is unavailable or incomplete

## D14. Product Scope Defaults

Decision: use the defaults approved by the owner.

Defaults:

- admin web is for one primary user first
- app supports multiple users at the data/auth level, but no user-management UI is required in v1
- admin MVP includes CRUD for plans plus draft/publish
- admin does not edit workout history in v1
- dashboard/statistics are out of scope
- Google is the only auth provider
- mobile can keep working offline without login
- plans are server-owned after migration
- workout sessions remain mobile-owned until pushed
- mobile downloads published plans only
- photos are JPEG, 5 MB max, stored on VPS disk
- AI import is admin-web only in v1; do not expose it through `/api/mobile/v1`
- AI import uses Anthropic through a server-only key and requires admin login
- `ANTHROPIC_MODEL` is fixed by environment variable; do not automatically chase "latest" model aliases
- AI import stores job metadata for debugging/rate visibility
- AI import does not store raw images or raw AI import payloads in v1
- AI extracted results persist only if the admin accepts them through a normal create/update flow
- AI import image payload limit is 5 MB before base64 encoding

Mobile offline/auth behavior:

- login is optional on mobile in v1
- without login, the mobile app keeps using local MMKV data and should not show backend errors
- sync, cloud photo backup, and server-published plan download require login
- after login, mobile pushes local workout sessions and pulls published plans through the sync API
- logout must not delete local workout history unless the user explicitly chooses a destructive reset flow in a future feature
- if refresh token fails with `401`, mobile clears remote session tokens, keeps local data, and returns to unauthenticated offline mode

Admin route map:

- `/admin` redirects to `/admin/plans`
- `/admin/login` starts Google login for admin
- `/admin/plans` lists active plans
- `/admin/plans/new` creates a draft plan
- `/admin/plans/[planId]` edits a draft, publishes it, archives it, and shows latest published status
- `/admin/import` runs AI import and lets the admin accept extracted data into a draft flow
- no dashboard/statistics/settings/user-management routes in v1

Admin plan editor:

- v1 uses a structured plan/exercise editor, not a raw JSON textarea as the primary workflow
- editor supports plan label/name, focus/category metadata, exercise list order, sets/reps/rest/equipment fields, and publish/archive actions
- validation uses `packages/domain` schemas before saving drafts and before publishing
- a raw JSON debug view may be added only if it is clearly secondary and cannot bypass validation

## D15. Environment Variables

Decision: use the following environment variable names.

Next.js server/runtime:

```text
FORJA_PUBLIC_URL=https://forja.phperalta.me
DATABASE_URL=postgres://...
TEST_DATABASE_URL=postgres://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FORJA_ALLOWED_USER_EMAILS=pedrohperalta@gmail.com
FORJA_ADMIN_EMAILS=pedrohperalta@gmail.com
FORJA_ACCESS_TOKEN_SECRET=...
FORJA_REFRESH_TOKEN_SECRET=...
FORJA_ADMIN_SESSION_SECRET=...
FORJA_AUTH_CODE_SECRET=...
FORJA_OAUTH_STATE_SECRET=...
FORJA_SYNC_CURSOR_SECRET=...
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-6
UPLOADS_DIR=/data/uploads
```

Mobile public Expo config:

```text
EXPO_PUBLIC_FORJA_API_URL=https://forja.phperalta.me
```

Migration-only fallback variables:

```text
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_PROJECT_REF=...
```

Rules:

- only variables prefixed with `EXPO_PUBLIC_` may be exposed to the mobile bundle
- Google client secret, token secrets, Anthropic key, database URL, and Supabase service role key are server-only
- prefer Supabase MCP for migration, but keep service-role variables documented as fallback
- validate server environment variables with a server-only Zod schema before handling requests
- fail fast on missing or invalid required production env vars
- never import server env validation into mobile or shared domain runtime
