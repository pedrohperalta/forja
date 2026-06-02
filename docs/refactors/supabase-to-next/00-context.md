# Supabase to Next.js Refactor — Context

## Objective

Replace the current Supabase-backed cloud layer with a self-hosted Next.js full-stack app in the same repository. The Next.js app will serve both:

- an admin web UI for managing workouts in the browser
- a stable REST API consumed by the Expo mobile app

The mobile app must remain offline-first. The backend becomes the canonical source for admin-authored workout plans, while the mobile app keeps local state in MMKV and syncs through explicit API contracts.

## Current Supabase Surface

The current codebase uses Supabase for four capabilities:

1. Auth
   - current path before Slice 0: `src/lib/supabase.ts`
   - target path after Slice 0: `mobile/src/lib/supabase.ts`
   - related files: `authStore.ts`, `auth/callback.tsx`

2. Plans and workout sessions sync
   - current path before Slice 0: `src/services/syncService.ts`
   - target path after Slice 0: `mobile/src/services/syncService.ts`
   - Supabase tables: `plans`, `workout_sessions`

3. Equipment photo backup
   - current path before Slice 0: `src/hooks/useEquipmentPhoto.ts`
   - target path after Slice 0: `mobile/src/hooks/useEquipmentPhoto.ts`
   - Supabase Storage bucket: `equipment-photos`
   - Path format: `{userId}/{exerciseId}.jpg`

4. AI workout import
   - current path before Slice 0: `src/services/importApi.ts`
   - target path after Slice 0: `mobile/src/services/importApi.ts`
   - `supabase/functions/extract-workout/index.ts`
   - Secret: `ANTHROPIC_API_KEY`

## Target Shape

```text
forja/
  mobile/                      # Existing Expo mobile app moved out of repo root
    src/
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
    domain/                    # Shared Zod schemas, types, constants, API contracts
  docs/
    refactors/
      supabase-to-next/
```

## Execution Principles

- Use TDD for every implementation slice.
- Prefer vertical slices that end in a working, tested capability.
- Keep mobile endpoints REST-like and versioned under `/api/mobile/v1`.
- Do not make the Expo app depend on Server Actions, React Server Components, web cookies, or Next.js-only client behavior.
- Do not remove Supabase until the replacement path for that capability is implemented and tested.
- Add internal client adapters before replacing call sites:
  - `AuthClient`
  - `CloudSyncClient`
  - `PhotoBackupClient`
  - `WorkoutImportClient`
- Preserve existing Supabase user IDs and record IDs during migration.

## Out Of Scope For The First Refactor

- Fully polished admin UI.
- Multi-user organizations or teams.
- Collaborative editing.
- Real-time sync.
- Push notifications.
- Replacing MMKV/offline-first storage.
- A feature-by-feature production cutover. This is a personal project, so cutover happens once at the end.

## Definition Of Done

The refactor is complete when:

- the mobile app no longer imports `@supabase/supabase-js`
- the mobile app no longer needs `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- the Expo app lives under `mobile/`
- auth, sync, and photos work against the Next.js backend from mobile
- AI import works in the admin web and has no mobile runtime dependency
- admin can create, edit, and publish plans
- mobile can download published plans
- Supabase export/import can be dry-run and validated
- all relevant tests, typechecks, and builds pass
