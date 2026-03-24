# Plan — Import Data Layer & Backend

**Track ID:** `import-data-layer_20260324`

## Phase 1: Types & Schemas

- [ ] Task 1.1: Create `src/types/import.ts` — `ExtractedExercise`, `ExtractedWorkout`, `ImportPhotoStatus` types. Export from `src/types/index.ts`.
- [ ] Task 1.2: Write tests for import Zod schemas — valid workout, missing fields, out-of-range values, invalid category
- [ ] Task 1.3: Create `src/schemas/import.ts` — `ExtractedExerciseSchema` (category validated against `MUSCLE_CATEGORIES`), `ExtractedWorkoutSchema`, `ExtractWorkoutResponseSchema`
- [ ] Task 1.4: Add `archived?: boolean` to `Plan` type in `src/types/workout.ts`
- [ ] Task 1.5: Update `PlanSchema` in `src/schemas/plan.ts` — add optional `archived` field
- [ ] Task 1.6: Update `makePlan` factory in `src/test-utils/factories.ts` — add `archived: false` default

### Checkpoint

- `npx tsc --noEmit` passes
- `npx jest src/schemas/import` passes

## Phase 2: planStore v2 — Archived Field & Migration

- [ ] Task 2.1: Write tests for planStore v2 migration — v1 state rehydrates with `archived: false` on all plans
- [ ] Task 2.2: Write tests for `archiveAllPlans()` — all plans get `archived: true`
- [ ] Task 2.3: Write tests for `importPlans(workouts, 'replace')` — archives active plans + creates new plans in single operation, generates IDs and labels, strips confidence from exercises. Include test case: when a workout is active, the plan used by that workout is NOT archived (guard via `useWorkoutStore.getState()`)
- [ ] Task 2.4: Write tests for `importPlans(workouts, 'add')` — adds plans without archiving, labels continue from `nextLabel`
- [ ] Task 2.5: Implement planStore v2 migration in `src/stores/planStore.ts` — iterate `state.plans`, set `archived: false` on each. Bump persist version to 2.
- [ ] Task 2.6: Implement `archiveAllPlans()` action — sets `archived: true` on all plans where `archived !== true`
- [ ] Task 2.7: Implement `importPlans(workouts: ExtractedWorkout[], mode: 'replace' | 'add')` — returns `{ skippedPlanId?: PlanId }`. Single `set()` call. Converts each `ExtractedWorkout` to `Plan`: generate PlanId, ExerciseIds via `Crypto.randomUUID()`, timestamps, strip confidence. Preserve AI-extracted workout name as `plan.name`, auto-generate `plan.label` from `nextLabel` via `incrementLabel()`. Mode `'replace'`: first archives all active plans, then creates new. Recomputes `nextLabel`. **Active workout guard**: check `useWorkoutStore.getState()` — if a workout is active, skip archiving that plan, include its id in `skippedPlanId`.

### Checkpoint

- `npx jest src/stores/planStore` passes (all existing + new tests)

## Phase 3: Filter Archived Plans in Existing Consumers

- [ ] Task 3.1: Update `src/app/index.tsx` — change `usePlanStore(s => s.plans)` to filter `plans.filter(p => !p.archived)` (or use a derived selector)
- [ ] Task 3.2: Update `src/app/plans/index.tsx` — same filter for plan list display
- [ ] Task 3.3: Update `src/utils/getNextPlanId.ts` or its call sites — ensure only active plans are passed
- [ ] Task 3.4: Verify `src/app/plans/[id]/index.tsx` uses full `plans` (NOT filtered) for ID lookup — archived plans should still be viewable if accessed by ID
- [ ] Task 3.5: Update `__tests__/screens/home.test.tsx` — update mock state to match new selector usage
- [ ] Task 3.6: Update `__tests__/screens/plans.test.tsx` — update mock state
- [ ] Task 3.7: Update any other test files affected by the selector change

### Checkpoint

- `npx jest` — all 166+ existing tests pass
- `npx tsc --noEmit` passes

## Phase 4: importStore

- [ ] Task 4.1: Write tests for `importStore` — addPhoto, removePhoto, setMode, updatePhotoStatus, setWorkouts, updateExtractedExercise, confirmImport (sets status to 'confirmed'), reset
- [ ] Task 4.2: Create `src/stores/importStore.ts` — ephemeral Zustand store (no persist). State: `photos: ImportPhotoStatus[]`, `workouts: ExtractedWorkout[]`, `mode: 'replace' | 'add'`, `status: 'idle' | 'capturing' | 'processing' | 'reviewing' | 'confirmed'`. All actions per spec.
- [ ] Task 4.3: `confirmImport()` implementation — reads `mode` and `workouts`, calls `usePlanStore.getState().importPlans(workouts, mode)`, captures `{ skippedPlanId }` return value and stores it in `importStore.skippedPlanId` state, sets status to `'confirmed'`

### Checkpoint

- `npx jest src/stores/importStore` passes

## Phase 5: importApi Service

- [ ] Task 5.1: Write tests for `importApi.extractWorkout()` — mock fetch: success (valid JSON), 422 error, network error, Zod validation failure
- [ ] Task 5.2: Write tests for category normalization — Portuguese categories pass through, English categories mapped, unknown defaults to 'Corpo Inteiro'
- [ ] Task 5.3: Create `src/services/importApi.ts` — `extractWorkout(imageUri: string, label: string): Promise<ExtractedWorkout>`. Reads URI → base64 via `expo-file-system`. POST to `${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/extract-workout` with anon key. Validates with Zod. Normalizes categories.

### Checkpoint

- `npx jest src/services/importApi` passes
- `npx tsc --noEmit` passes

## Phase 6: Supabase Edge Function

- [ ] Task 6.1: Initialize Supabase project — `supabase/config.toml` (or manual directory creation)
- [ ] Task 6.2: Create `supabase/functions/extract-workout/index.ts` — Deno Edge Function. Receives `{ image: string, label: string }`. Calls Claude Sonnet 4.6 via Anthropic SDK (`npm:@anthropic-ai/sdk`). Reads `ANTHROPIC_API_KEY` from `Deno.env.get()`. Prompt specifies Portuguese categories with accents. Returns `{ workout: ExtractedWorkout }` or `{ error: string }` with 422.
- [ ] Task 6.3: Create `.env.local.example` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` placeholders. Verify `.env.local` pattern exists in `.gitignore` (already present as `.env*.local`). Document Supabase secret setup: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` (required for Edge Function to call Claude).

### Checkpoint

- Edge Function can be deployed with `supabase functions deploy extract-workout`
- `npx tsc --noEmit` passes (Supabase files are Deno, not checked by app tsconfig)

## Phase 7: Final Verification & PR

- [ ] Task 7.1: Run full test suite — `npx jest` — all tests pass
- [ ] Task 7.2: Run typecheck — `npx tsc --noEmit`
- [ ] Task 7.3: Create PR with all changes
