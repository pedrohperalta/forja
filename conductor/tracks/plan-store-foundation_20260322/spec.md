# Spec — Plan Store Foundation

**Track ID:** `plan-store-foundation_20260322`
**Origin:** Masons Idea `training_configuration`
**Depends on:** none

## Problem

The app uses hardcoded workout plans in `src/constants/plans.ts` — 3 fixed ABC plans with 21 exercises. Users cannot create, edit, or remove plans. The type system lacks fields needed for dynamic configuration (rest time per exercise, plan labels, timestamps for future API sync). Before any configuration screens can be built, the data layer must support dynamic plans with full CRUD operations and persistence.

## Acceptance Criteria

1. `Exercise` type extended with `restSeconds: number`, `createdAt: string`, `updatedAt: string` (all required)
2. `Plan` type extended with `label: string`, `createdAt: string`, `updatedAt: string` (all required)
3. `NavigationTarget` rest variant extended to `{ target: 'rest'; restSeconds: number }`
4. `WorkoutSession` type extended with optional `planLabel?: string`
5. `buildWorkoutSession` snapshots `plan.label` into `planLabel`
6. `WorkoutSessionSchema` in `src/schemas/workout.ts` updated with optional `planLabel`
7. Zod schemas for `Exercise` and `Plan` in `src/schemas/plan.ts`
8. `planStore` created with Zustand v5 + MMKV persistence:
   - State: `{ plans: Plan[], nextLabel: string }`
   - `nextLabel` starts at `'A'`, persisted in MMKV `partialize`
   - `addPlan`: auto-assigns `nextLabel` as plan label, increments (A→Z→AA)
   - `updatePlan`, `removePlan` (with active-workout guard), `addExercise`, `updateExercise`, `removeExercise`, `reorderExercises`
   - `removePlan` guard: returns early if `workoutStore.getState().activePlan?.id === planId && status === 'active'`
   - Uses `Crypto.randomUUID()` from `expo-crypto` for ID generation
9. `MUSCLE_CATEGORIES` constant with 12 Portuguese muscle group names
10. `src/constants/plans.ts` updated with all new required fields; categories changed from codes to Portuguese names
11. `getNextPlanId` rewritten: new signature `(plans: Plan[], lastDates)`, internal `PLAN_IDS` removed, derives IDs from `plans` param
12. `workoutStore.completeSet` returns `{ target: 'rest', restSeconds: exercise.restSeconds }` at both return sites (pre-mutation local variable)
13. `workoutStore` bumped to version 2 with migration: guards `if (state.activePlan)` and `if (state.queue?.length)` before backfilling `restSeconds=60`, `createdAt`/`updatedAt`=ISO now, `label` from name prefix or `'X'`
14. Shared test factories in `src/test-utils/factories.ts` with all new fields (Portuguese categories)
15. All test files updated to use shared factories
16. `workoutStore.test.ts` assertions updated: `{ target: 'rest' }` → `{ target: 'rest', restSeconds: 60 }`
17. `getNextPlanId.test.ts` updated for new signature
18. `PendingExerciseCard.test.tsx` assertions updated for Portuguese category names
19. `plans.test.ts` validates new fields
20. `expo-crypto` installed as dependency
21. `npx tsc --noEmit` passes with zero errors
22. All existing tests pass after updates

## Out of Scope

- Plan configuration screens (Track 2: `plan-config-screens_20260322`)
- Home screen integration, rest screen wiring, plan deletion (Track 3: `plan-integration-polish_20260322`)
- Screen-level changes to `exercise.tsx`, `rest.tsx`, or `index.tsx` navigation behavior

## Technical Context

### Updated Type Definitions

```typescript
type Exercise = {
  id: ExerciseId
  name: string
  category: string        // Portuguese muscle group name (e.g., "Peito")
  equipment: string
  reps: string            // range: "10-12"
  sets: number
  restSeconds: number     // default 60
  createdAt: string       // ISO timestamp
  updatedAt: string       // ISO timestamp
}

type Plan = {
  id: PlanId
  label: string           // auto-assigned: "A", "B", "C", ...
  name: string
  focus: string
  exercises: Exercise[]
  createdAt: string       // ISO timestamp
  updatedAt: string       // ISO timestamp
}

type NavigationTarget =
  | { target: 'rest'; restSeconds: number }
  | { target: 'checkpoint' }
  | { target: 'complete' }
  | { target: 'next' }

// WorkoutSession gains optional planLabel
type WorkoutSession = {
  // ... existing fields ...
  planLabel?: string      // optional — absent on historical sessions
}
```

### planStore Interface

```typescript
interface PlanState {
  plans: Plan[]
  nextLabel: string
  addPlan: (name: string, focus: string) => PlanId
  updatePlan: (id: PlanId, changes: Partial<Pick<Plan, 'name' | 'focus'>>) => void
  removePlan: (id: PlanId) => void
  addExercise: (planId: PlanId, exercise: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateExercise: (planId: PlanId, exerciseId: ExerciseId, changes: Partial<Omit<Exercise, 'id' | 'createdAt'>>) => void
  removeExercise: (planId: PlanId, exerciseId: ExerciseId) => void
  reorderExercises: (planId: PlanId, orderedIds: ExerciseId[]) => void
}
```

### Muscle Categories

12 groups: Peito, Costas, Ombros, Bíceps, Tríceps, Antebraço, Abdômen, Quadríceps, Posterior, Glúteos, Panturrilha, Corpo Inteiro

### workoutStore Migration v1 → v2

- Guard: `if (state.activePlan)` before backfilling activePlan exercises and plan fields
- Guard: `if (state.queue?.length)` before backfilling queue exercises
- Backfill: `restSeconds=60`, `createdAt`/`updatedAt`=`new Date().toISOString()`, `label` from activePlan name prefix or `'X'`

### Notes

- `exercise.tsx` `handleNavigation` still pushes to `/(workout)/rest` without `restSeconds` param — this is intentional. Screen wiring happens in Track 3.
- `rest.tsx` still uses `REST_DURATION_SECONDS = 60` — wired in Track 3.
- `getNextPlanId` call site in `index.tsx` updated to `getNextPlanId(PLAN_ENTRIES, lastDates)` — `PLAN_ENTRIES` is the existing `Object.values(PLANS)` variable.
- `planLabel` is optional on `WorkoutSession` to avoid appStore migration — old history entries simply don't have it.
