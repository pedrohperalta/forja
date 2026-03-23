# Plan — Plan Store Foundation

**Track ID:** `plan-store-foundation_20260322`

## Phase 1: Dependencies & Type Extensions

- [ ] Task 1.1: Install `expo-crypto` — `npx expo install expo-crypto`
- [ ] Task 1.2: Extend `Exercise` type in `src/types/workout.ts` — add `restSeconds: number`, `createdAt: string`, `updatedAt: string` (all required)
- [ ] Task 1.3: Extend `Plan` type in `src/types/workout.ts` — add `label: string`, `createdAt: string`, `updatedAt: string` (all required)
- [ ] Task 1.4: Extend `NavigationTarget` rest variant — `{ target: 'rest'; restSeconds: number }`
- [ ] Task 1.5: Add optional `planLabel?: string` to `WorkoutSession` type
- [ ] Task 1.6: Update `WorkoutSessionSchema` in `src/schemas/workout.ts` — add optional `planLabel`

### Checkpoint

- `npx tsc --noEmit` will fail (expected — downstream files don't have new required fields yet)

## Phase 2: Shared Test Factories

- [ ] Task 2.1: Create `src/test-utils/factories.ts` with `makeExercise` and `makePlan` functions that include all new required fields (Portuguese category names, restSeconds=60, timestamps, label)
- [ ] Task 2.2: Update `src/stores/workoutStore.test.ts` — replace local factories with shared imports
- [ ] Task 2.3: Update `__tests__/screens/exercise.test.tsx` — replace local factories
- [ ] Task 2.4: Update `__tests__/screens/rest.test.tsx` — replace local factories
- [ ] Task 2.5: Update `__tests__/screens/complete.test.tsx` — replace local factories
- [ ] Task 2.6: Update `__tests__/screens/checkpoint.test.tsx` — replace local factories
- [ ] Task 2.7: Update `src/utils/buildWorkoutSession.test.ts` — replace local `makePlan` factory
- [ ] Task 2.8: Update `src/utils/getCurrentExercise.test.ts` — replace local factories
- [ ] Task 2.9: Update any other test files with local Exercise/Plan factories

## Phase 3: Constants & Schemas

- [ ] Task 3.1: Write tests for `MUSCLE_CATEGORIES` — verify 12 groups, all strings, no duplicates
- [ ] Task 3.2: Create `src/constants/categories.ts` — export `MUSCLE_CATEGORIES` array (12 Portuguese muscle group names)
- [ ] Task 3.3: Update `src/constants/plans.ts` — add `restSeconds`, `label`, `createdAt`, `updatedAt` to all 3 plans and 21 exercises. Change category values from codes (`EMPH`, `PXV`, etc.) to Portuguese names (`Peito`, `Costas`, etc.)
- [ ] Task 3.4: Update `src/constants/plans.test.ts` — validate new fields (restSeconds, label, createdAt, updatedAt) on all exercises and plans
- [ ] Task 3.5: Update `src/components/PendingExerciseCard.test.tsx` — update assertions from old category codes to Portuguese names
- [ ] Task 3.6: Write tests for Plan Zod schemas — valid plan, invalid plan (missing fields, wrong types)
- [ ] Task 3.7: Create `src/schemas/plan.ts` — Zod schemas for `Exercise` and `Plan` validation

### Checkpoint

- `npx tsc --noEmit` passes
- `npx jest src/constants` passes
- `npx jest src/schemas` passes

## Phase 4: planStore

- [ ] Task 4.1: Write tests for `planStore` — addPlan (auto-assigns label, increments nextLabel), updatePlan, removePlan (including active-workout guard), addExercise, updateExercise, removeExercise, reorderExercises, MMKV persistence (nextLabel persisted), empty initial state
- [ ] Task 4.2: Create `src/stores/planStore.ts` — Zustand v5 store with MMKV persistence. State: `{ plans: Plan[], nextLabel: string }`. All CRUD actions. `removePlan` guard checks `useWorkoutStore.getState()`. Uses `Crypto.randomUUID()` from expo-crypto. `nextLabel` in `partialize`.
- [ ] Task 4.3: Verify planStore tests pass

### Checkpoint

- `npx jest src/stores/planStore` passes
- planStore persists and rehydrates correctly (verified via test)

## Phase 5: getNextPlanId Rewrite

- [ ] Task 5.1: Update `src/utils/getNextPlanId.test.ts` — change all test calls to new signature `(plans, lastDates)`. Add test: returns correct plan when plans array has UUIDs. Add test: ignores lastDates entries for plans not in the array.
- [ ] Task 5.2: Rewrite `src/utils/getNextPlanId.ts` — new signature `getNextPlanId(plans: Plan[], lastDates: Partial<Record<string, string>>)`. Remove hardcoded `PLAN_IDS`. Derive IDs from `plans.map(p => p.id)`.
- [ ] Task 5.3: Update call site in `src/app/index.tsx` — change `getNextPlanId(lastDates)` to `getNextPlanId(PLAN_ENTRIES, lastDates)`

### Checkpoint

- `npx jest src/utils/getNextPlanId` passes
- `npx tsc --noEmit` passes

## Phase 6: workoutStore Updates

- [ ] Task 6.1: Update `workoutStore.test.ts` — change all `{ target: 'rest' }` assertions to `{ target: 'rest', restSeconds: 60 }` (since test exercises have restSeconds=60 via shared factory). Add migration test: rehydrated v1 state with activePlan gets backfilled fields. Add migration test: rehydrated v1 state with null activePlan is not modified.
- [ ] Task 6.2: Update `src/stores/workoutStore.ts` — `completeSet` returns `{ target: 'rest', restSeconds: exercise.restSeconds }` at both return sites (line ~75 mid-set, line ~100 last-set). Both read from the pre-mutation `exercise` local variable.
- [ ] Task 6.3: Bump workoutStore to version 2 with real migrate function — guard `if (state.activePlan)` → backfill exercises (`restSeconds=60`, `createdAt`/`updatedAt`=ISO now) and plan (`label` from name prefix or `'X'`, `createdAt`/`updatedAt`=ISO now). Guard `if (state.queue?.length)` → backfill queue exercises.
- [ ] Task 6.4: Update `buildWorkoutSession` to snapshot `plan.label` into `planLabel` field
- [ ] Task 6.5: Update `buildWorkoutSession.test.ts` — verify `planLabel` is present in output

### Checkpoint

- `npx jest src/stores/workoutStore` passes
- `npx jest src/utils/buildWorkoutSession` passes

## Verification

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npx eslint .` — zero errors
- [ ] `npx jest` — all tests pass (existing + new)
- [ ] App boots on device via development build
- [ ] planStore persists across app restart (verify via MMKV inspector or test)
