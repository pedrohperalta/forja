# Spec — Import Data Layer & Backend

**Track ID:** `import-data-layer_20260324`
**Origin:** Masons Idea `smart_training_import`
**Depends on:** none

## Problem

Adding training plans to Forja is entirely manual — the user types every exercise name, category, sets, reps, rest, and equipment for 15-20 exercises per program swap. This takes ~30 minutes and produces frequent typos. The app has no mechanism to receive structured data from an external source, no API integration layer, and no way to replace an entire plan atomically.

This track builds the data foundation: new types for AI-extracted workouts, a Supabase Edge Function that processes workout photos via Claude Vision, an API client with Zod validation, store changes to support plan archival and bulk import, and an ephemeral import store to manage the import flow state.

## Acceptance Criteria

1. `ExtractedExercise`, `ExtractedWorkout`, `ImportPhotoStatus` types in `src/types/import.ts` (no `ImportSession` — store manages state directly)
2. Zod schemas in `src/schemas/import.ts` validate API response — category validated against `MUSCLE_CATEGORIES`
3. `Plan` type extended with `archived?: boolean`
4. `PlanSchema` in `src/schemas/plan.ts` updated with optional `archived`
5. `makePlan` factory in `src/test-utils/factories.ts` includes `archived: false`
6. `planStore` bumped to v2 — migration backfills `archived: false` on existing plans
7. `planStore.importPlans(workouts: ExtractedWorkout[], mode: 'replace' | 'add')` — returns `{ skippedPlanId?: PlanId }`. Accepts extracted workouts, generates PlanId/ExerciseId/timestamps, strips confidence. Preserves AI-extracted workout name as `plan.name`, auto-generates `plan.label` from `nextLabel`. Mode `'replace'` archives + imports in a single `set()` call (atomic).
8. `planStore.archiveAllPlans()` — sets `archived: true` on all active plans (used internally by `importPlans` in replace mode)
9. Active plans selector: all consumers of `usePlanStore(s => s.plans)` in list/grid views (home, plans screen, getNextPlanId) updated to filter `archived !== true`. Plan detail (`plans/[id]/`) keeps full `plans` for defensive ID lookup.
10. All existing screen tests updated to work with the new selector pattern
11. `importStore` (ephemeral Zustand, no persistence) with state: `photos`, `workouts`, `mode`, `status`, `skippedPlanId` and actions: `addPhoto`, `removePhoto`, `setMode`, `updatePhotoStatus`, `setWorkouts`, `updateExtractedExercise(workoutIndex, exerciseIndex, changes)`, `confirmImport` (two-step: sets status to `'confirmed'`, captures `skippedPlanId` from `importPlans` return), `reset`
12. `importApi.ts` in `src/services/` — accepts image URI, converts to base64 via `expo-file-system`, calls Supabase Edge Function, validates response with Zod, returns `ExtractedWorkout`
13. Category normalization: importApi maps AI response categories to `MUSCLE_CATEGORIES` entries, defaulting unmapped to `'Corpo Inteiro'`
14. Supabase Edge Function `extract-workout` in `supabase/functions/` — receives base64 image + label, calls Claude Sonnet 4.6, returns structured JSON
15. Edge Function prompt specifies Portuguese categories matching `MUSCLE_CATEGORIES` exactly (with accents)
16. `npx tsc --noEmit` passes
17. All existing + new tests pass

## Out of Scope

- UI components (Track 2: `import-ui-capture_20260324`)
- Import screens and routes (Track 2 + Track 3)
- Entry points in home/plans screens (Track 3: `import-review-integration_20260324`)
- lastWeights remapping on import (accepted v1 limitation — new exercises get new UUIDs, old weights become orphaned)

## Technical Context

### Architecture

```
App → importApi.ts → Supabase Edge Function → Claude Vision Sonnet 4.6
                                            ← ExtractedWorkout JSON
App ← Zod validation ← importApi.ts
App → importStore.confirmImport() → planStore.importPlans()
```

### Key Decisions

- **Supabase Edge Function** chosen for: API key security, free tier (500k invocations), future sync/web base
- **No `@supabase/supabase-js`** — raw `fetch()` with anon key in Authorization header (zero new npm deps)
- **importStore is ephemeral** — no MMKV persistence, state lives only during import flow
- **planStore.importPlans() owns conversion** — accepts `ExtractedWorkout[]`, generates IDs/timestamps internally, strips `confidence`
- **Atomic replace** — `importPlans(workouts, 'replace')` archives + imports in a single `set()` to avoid flash of empty state
- **Active workout guard** — `importPlans` in replace mode skips archiving the plan used by an active workout, returns `{ skippedPlanId }` so UI can show alert
- **Name preservation** — `importPlans` preserves the AI-extracted workout name as `plan.name` and auto-generates `plan.label` from `nextLabel`; user sees meaningful AI names (e.g., "Treino de Peito") in the plan list
- **`importApi` accepts URI** — converts to base64 internally via `expo-file-system` (already in Expo SDK)

### Category Normalization

The Claude Vision prompt requests Portuguese categories matching `MUSCLE_CATEGORIES`. Additionally, `importApi` normalizes the response:

```typescript
const CATEGORY_MAP: Record<string, string> = {
  'Chest': 'Peito', 'Back': 'Costas', 'Shoulders': 'Ombros',
  'Biceps': 'Bíceps', 'Triceps': 'Tríceps', 'Forearm': 'Antebraço',
  'Abs': 'Abdômen', 'Quads': 'Quadríceps', 'Hamstrings': 'Posterior',
  'Glutes': 'Glúteos', 'Calves': 'Panturrilha', 'Full Body': 'Corpo Inteiro',
  // + accent-stripped variants
}
```
