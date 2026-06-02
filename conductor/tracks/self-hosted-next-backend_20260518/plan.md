# Plan — Self-Hosted Next.js Admin & Backend

**Track ID:** `self-hosted-next-backend_20260518`

## Phase 1: Architecture Baseline

- [ ] Task 1.1: Document final package layout decision — keep Expo app at repo root for now, add `web/` and `packages/domain/`, defer moving mobile into `mobile/`.
- [ ] Task 1.2: Decide ORM (`Prisma` or `Drizzle`) and record the decision in this track or a short ADR.
- [ ] Task 1.3: Decide auth implementation (`Auth.js` or custom Google OAuth + JWT) and record mobile/admin session requirements.
- [ ] Task 1.4: Define environment variable names for local dev and VPS production.
- [ ] Task 1.5: Define API versioning rules for `/api/mobile/v1`.

### Checkpoint

- Architecture decisions are documented before scaffolding code.

## Phase 2: Shared Domain Package

- [ ] Task 2.1: Write failing tests for shared plan, exercise, workout session, equipment photo, auth user, and sync envelope schemas.
- [ ] Task 2.2: Create `packages/domain` package with TypeScript, Zod, and test setup.
- [ ] Task 2.3: Move or mirror stable domain constants and schemas from the Expo app into `packages/domain`.
- [ ] Task 2.4: Export mobile-safe types for API request and response contracts.
- [ ] Task 2.5: Update TypeScript path/package resolution so mobile and web can import shared domain code.

### Checkpoint

- Domain package tests pass.
- Typecheck passes for the shared package.

## Phase 3: Next.js App Scaffold

- [ ] Task 3.1: Write a smoke test for the web app health route.
- [ ] Task 3.2: Scaffold `web/` as a Next.js App Router application.
- [ ] Task 3.3: Add `web/app/api/health/route.ts`.
- [ ] Task 3.4: Add baseline lint, test, typecheck, and build scripts for `web`.
- [ ] Task 3.5: Configure self-hosting output for Docker/Node deployment.
- [ ] Task 3.6: Add a minimal `/admin` route guarded by a placeholder auth boundary.

### Checkpoint

- `web` health route test passes.
- `web` typecheck and build pass.

## Phase 4: Database Foundation

- [ ] Task 4.1: Write repository tests for users, plans, plan revisions, workout sessions, photos, and refresh tokens using a test database strategy.
- [ ] Task 4.2: Add PostgreSQL schema/migrations.
- [ ] Task 4.3: Create database client module under `web/src/server/db`.
- [ ] Task 4.4: Implement repositories with explicit return types and Zod validation at boundaries.
- [ ] Task 4.5: Add seed data for local development.

### Checkpoint

- Database repository tests pass.
- Migrations can be applied locally from a clean database.

## Phase 5: Auth

- [ ] Task 5.1: Write tests for Google account linking and preserving imported Supabase user IDs.
- [ ] Task 5.2: Write tests for mobile access token issuance and refresh token rotation.
- [ ] Task 5.3: Write tests for admin cookie session behavior.
- [ ] Task 5.4: Implement Google OAuth callback handling.
- [ ] Task 5.5: Implement `/api/mobile/v1/auth/*` endpoints for sign-in, callback/exchange if needed, refresh, logout, and current user.
- [ ] Task 5.6: Implement admin auth helpers and protected admin layout.
- [ ] Task 5.7: Store refresh tokens hashed server-side.

### Checkpoint

- Auth route tests pass.
- Admin can sign in locally.
- Mobile auth contract is documented.

## Phase 6: Plans And Publishing

- [ ] Task 6.1: Write tests for admin plan CRUD, draft updates, publish flow, and published-plan listing.
- [ ] Task 6.2: Implement server services for plans, exercises, drafts, and published revisions.
- [ ] Task 6.3: Implement admin routes or Server Actions for plan CRUD.
- [ ] Task 6.4: Implement mobile endpoints for published plans and changed plans since cursor.
- [ ] Task 6.5: Add conflict rules: admin-authored plan definitions are server-owned; mobile workout history remains user-owned.
- [ ] Task 6.6: Add minimal admin screens for listing, creating, editing, and publishing plans.

### Checkpoint

- Plan service and route tests pass.
- Admin can publish a plan locally.
- Mobile can fetch published plans through REST.

## Phase 7: Workout Sessions And Sync

- [ ] Task 7.1: Write tests for mobile sync pull and push envelopes.
- [ ] Task 7.2: Write tests for workout session creation, update, deletion, and idempotent upsert.
- [ ] Task 7.3: Implement `/api/mobile/v1/sync/pull`.
- [ ] Task 7.4: Implement `/api/mobile/v1/sync/push`.
- [ ] Task 7.5: Implement `/api/mobile/v1/workout-sessions/:id` delete endpoint.
- [ ] Task 7.6: Update mobile sync service tests to target the new API client abstraction instead of Supabase.
- [ ] Task 7.7: Implement mobile API client and replace Supabase sync calls.

### Checkpoint

- Mobile sync tests pass.
- Existing offline-first store behavior remains intact.

## Phase 8: Equipment Photos

- [ ] Task 8.1: Write tests for authenticated photo upload, listing, restore/download, and deletion.
- [ ] Task 8.2: Implement server-side storage adapter for VPS disk uploads.
- [ ] Task 8.3: Implement `/api/mobile/v1/photos/*` endpoints.
- [ ] Task 8.4: Implement filename/path normalization that preserves current `{userId}/{exerciseId}.jpg` migration compatibility.
- [ ] Task 8.5: Update `useEquipmentPhoto` tests to mock the new API client.
- [ ] Task 8.6: Replace Supabase Storage calls in mobile photo logic.

### Checkpoint

- Photo route tests pass.
- Mobile equipment photo tests pass.

## Phase 9: AI Import Endpoint

- [ ] Task 9.1: Write tests for `/api/mobile/v1/import/extract-workout` success, validation errors, Anthropic errors, and malformed model output.
- [ ] Task 9.2: Move the prompt and response normalization into shared/server modules.
- [ ] Task 9.3: Implement the Next.js route handler that calls Anthropic with server-only `ANTHROPIC_API_KEY`.
- [ ] Task 9.4: Update `importApi` tests to use `EXPO_PUBLIC_FORJA_API_URL` and the new endpoint.
- [ ] Task 9.5: Replace Supabase Edge Function URL usage in the mobile app.
- [ ] Task 9.6: Keep the old Supabase function untouched until production migration is verified.

### Checkpoint

- Import API tests pass in web and mobile.
- No mobile import path references Supabase.

## Phase 10: VPS Deployment And Supabase Migration

- [ ] Task 10.1: Write migration dry-run tests or scripts that validate exported Supabase rows against the new domain schemas.
- [ ] Task 10.2: Add Docker Compose or equivalent VPS deployment config for Next.js, PostgreSQL, reverse proxy, uploads volume, and backups.
- [ ] Task 10.3: Add database backup and uploads backup scripts.
- [ ] Task 10.4: Add Supabase export script for users, plans, workout sessions, and equipment photos.
- [ ] Task 10.5: Add import script that preserves user IDs, record IDs, timestamps, and photo paths.
- [ ] Task 10.6: Run local migration dry-run from exported sample data.
- [ ] Task 10.7: Remove `@supabase/supabase-js` from mobile dependencies after all call sites are gone.
- [ ] Task 10.8: Remove `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from mobile docs/examples.
- [ ] Task 10.9: Add `EXPO_PUBLIC_FORJA_API_URL` and production deployment docs.
- [ ] Task 10.10: Run full verification: mobile tests, web tests, typecheck, lint, and web build.

### Checkpoint

- VPS deployment can be recreated from repo docs/config.
- Migration can be run with a dry-run mode.
- No runtime Supabase dependency remains in the mobile app.

## Final Verification

- [ ] Full mobile test suite passes.
- [ ] Full web test suite passes.
- [ ] Domain package tests pass.
- [ ] TypeScript typecheck passes for all packages.
- [ ] Web production build succeeds.
- [ ] Supabase migration dry-run succeeds.
- [ ] Manual mobile smoke test confirms sign-in, sync, photo restore, and workout import against the new backend.
- [ ] Manual admin smoke test confirms login, plan edit, publish, and mobile download.
