# Spec — Self-Hosted Next.js Admin & Backend

**Track ID:** `self-hosted-next-backend_20260518`
**Origin:** Product direction — replace Supabase with a self-hosted service on Hostinger VPS and prepare a browser admin for training management
**Depends on:** none

## Problem

Forja currently started as an offline-first Expo app, but the codebase now depends on Supabase for four backend capabilities:

1. Google OAuth and persisted sessions via `@supabase/supabase-js`
2. Cloud sync for plans and workout sessions through PostgREST tables
3. Equipment photo backup through Supabase Storage
4. AI workout extraction through a Supabase Edge Function that calls Anthropic

The next product step is an admin web experience where workouts can be managed from a browser and then downloaded by the mobile app. A one-for-one Supabase replacement would solve hosting ownership but would not create the right foundation for admin-driven workout management.

This track creates a self-hosted Next.js full-stack application in the same repo. The Next.js app serves both the admin web UI and a stable REST API for the Expo mobile app. The backend runs on the Hostinger VPS with PostgreSQL, persistent upload storage, HTTPS reverse proxy, backups, and explicit migration steps from Supabase.

## Goals

- Add a `web/` Next.js application that contains the admin UI and backend API.
- Keep the Expo mobile app as an offline-first client.
- Make the Next.js API the canonical backend for auth, sync, photos, and AI import.
- Prepare the data model for admin-authored plans, draft/published workflows, and mobile downloads.
- Preserve existing Supabase user IDs and synced records during migration.
- Avoid coupling the mobile app to Next.js Server Actions or web-only internals.

## Non-Goals

- Building the complete polished admin UI in this track.
- Rewriting existing mobile screens unless required for API migration.
- Adding multi-tenant organization/team management.
- Building collaborative editing.
- Implementing real-time sync or push notifications.
- Removing MMKV/offline-first local storage from the mobile app.

## Acceptance Criteria

1. Repo includes a `web/` Next.js app configured for self-hosting on Node.js.
2. Repo includes shared domain package structure for cross-client schemas and types, such as `packages/domain`.
3. Domain package exports Zod schemas and TypeScript types for users, plans, exercises, workout sessions, equipment photos, sync envelopes, and import responses.
4. PostgreSQL schema supports users, accounts, sessions or refresh tokens, plans, plan versions/drafts, workout sessions, equipment photos, and import jobs/audit metadata.
5. Existing Supabase IDs can be preserved during data migration.
6. Next.js exposes stable mobile REST endpoints under `/api/mobile/v1/*`.
7. Admin-only functionality is exposed separately under `/admin` pages and internal server modules.
8. Mobile endpoints validate all input with shared Zod schemas and return structured error responses.
9. Auth supports Google sign-in for admin web and mobile.
10. Mobile auth uses bearer access tokens plus refresh flow, not web-only cookies.
11. Admin web auth uses secure HTTP-only cookies.
12. Plan API supports draft editing, publishing, listing published plans, and fetching changed plans since a cursor.
13. Sync API supports mobile pull/push for plans and workout sessions without breaking offline-first behavior.
14. Equipment photo API supports authenticated upload, delete, listing, and short-lived download URLs or authenticated file responses.
15. AI import endpoint replaces the Supabase Edge Function and calls Anthropic from the server only.
16. Mobile app no longer imports `@supabase/supabase-js` after migration is complete.
17. Mobile app no longer depends on `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
18. Supabase migration scripts export and import users, plans, workout sessions, and equipment photos into the new backend.
19. Hostinger VPS deployment uses Docker or a documented equivalent with Next.js, PostgreSQL, uploads volume, reverse proxy, and backups.
20. Tests cover domain schemas, database repositories, API route handlers, auth flows, sync conflict behavior, and mobile client adapters.
21. `npm test` or documented package-specific test commands pass for changed packages.
22. TypeScript typecheck passes for mobile, web, and shared packages.

## Technical Context

### Current Backend Surface

```text
Expo app
  -> Supabase Auth
  -> Supabase PostgREST tables: plans, workout_sessions
  -> Supabase Storage bucket: equipment-photos
  -> Supabase Edge Function: extract-workout
```

### Target Architecture

```text
Expo mobile app
  -> HTTPS REST API /api/mobile/v1/*

Next.js web app
  -> /admin browser UI
  -> Route Handlers for mobile API
  -> Server Actions only for admin-local mutations where useful
  -> Shared server services

PostgreSQL
  -> canonical users, plans, plan versions, sessions, photos

VPS
  -> reverse proxy with HTTPS
  -> Next.js Node server
  -> PostgreSQL
  -> persistent uploads volume
  -> scheduled backups
```

### Repo Layout

```text
forja/
  src/                         # existing Expo mobile app
  web/                         # Next.js admin + backend API
    app/
      admin/
      api/
        mobile/
          v1/
    src/
      server/
        auth/
        db/
        services/
        storage/
  packages/
    domain/                    # shared Zod schemas, types, constants
```

### API Boundary Rule

The admin web can use Next.js-native patterns such as Server Components and Server Actions. The mobile app must use stable HTTP endpoints only. Mobile should never depend on Server Actions, RSC internals, web cookies, or Next.js-specific client behavior.

### Data Ownership Shift

Current behavior treats the device as the primary source and Supabase as cloud backup. With an admin web, the backend becomes the canonical source for authored plans. Mobile remains offline-first, but it downloads published plans and syncs local workout activity back to the server.

### Plan Publishing Model

Admin edits should support a draft/published split:

- Draft plans can be changed freely in the admin.
- Published plan versions are visible to mobile clients.
- Mobile sync receives plan revisions by `updatedAt`, `revision`, or a server cursor.
- Workout history references the exact plan/exercise identifiers used when the workout was performed.

### Security Model

- All external input is validated with Zod at route boundaries.
- Server-only secrets stay in `web` runtime environment variables.
- Mobile access tokens are short-lived.
- Refresh tokens are stored hashed server-side and persisted securely client-side through MMKV.
- Admin sessions use secure HTTP-only cookies.
- File access is always scoped by authenticated user.

### Deployment Model

Hostinger VPS should run a predictable self-hosted stack:

```text
reverse-proxy  -> HTTPS, domain routing
web            -> Next.js standalone Node server
postgres       -> database volume
uploads        -> equipment photos and import artifacts
backups        -> scheduled DB dump + uploads archive
```

## Key Decisions

- Use Next.js full-stack instead of a separate Fastify API because the product needs an admin web and backend in the same ownership boundary.
- Keep the API explicit and REST-like for mobile stability.
- Introduce `packages/domain` before moving large mobile code so both clients share the same contract.
- Keep uploads on VPS disk initially. Object storage can be introduced later if volume size, CDN, or backup needs outgrow local storage.
- Preserve Supabase user IDs during import to reduce migration risk.
- Keep mobile offline-first with MMKV and sync metadata.

## Open Questions

1. Should the Next.js package live at `web/` while the current Expo app remains at repo root, or should the Expo app move to `mobile/` in a later cleanup?
2. Should auth use Auth.js for Google OAuth or a small custom OAuth/JWT implementation?
3. Should the ORM be Prisma or Drizzle?
4. Should equipment photos be served through authenticated API responses or short-lived signed URLs generated by the app?
5. Should admin drafts support multiple saved versions immediately, or just one mutable draft plus one published snapshot?
6. Which domain will be used for the VPS API and admin, for example `forja.example.com` and `api.forja.example.com` or one domain with paths?

## Migration Inventory

### Supabase Tables

- `plans`
  - `id`
  - `user_id`
  - `data`
  - `updated_at`
  - `deleted_at`
  - `created_at`

- `workout_sessions`
  - `id`
  - `user_id`
  - `data`
  - `updated_at`
  - `created_at`

### Supabase Storage

- Bucket: `equipment-photos`
- Path format: `{userId}/{exerciseId}.jpg`

### Supabase Edge Function

- Function: `extract-workout`
- Input: `{ image: string, label: string }`
- Output: `{ workout: ExtractedWorkout }` or `{ error: string }`
- Secret: `ANTHROPIC_API_KEY`

## Risks

- Auth migration can strand existing users if user IDs or Google account mappings are not preserved.
- Mobile sync conflict behavior can overwrite admin changes if plan authorship is not clearly separated from workout history sync.
- VPS local file uploads require disciplined backups.
- Next.js self-hosting is straightforward for one VPS, but deployment should avoid advanced cache assumptions until needed.
- Moving shared types too aggressively can create churn across the Expo app.
