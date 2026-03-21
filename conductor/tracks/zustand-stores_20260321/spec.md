# Spec — Zustand Stores (TDD)

**Track ID:** `zustand-stores_20260321`
**Origin:** Forja MVP Solution Design v4
**Tasks:** T-07, T-08, T-09, T-10
**Depends on:** [`project-foundation_20260321`](../project-foundation_20260321/spec.md)

## Problem

The app needs two Zustand v5 stores persisted via MMKV — one for active workout state (`workoutStore`) and one for persistent data (`appStore`). All business logic lives in these stores. Strict TDD: tests first, then implementation.

## Acceptance Criteria

### appStore

1. `saveWorkout(session)` adds session to history AND updates `lastDates[session.planId]`
2. `saveWorkout` is **idempotent** — checks `history.some(w => w.id === session.id)` before inserting
3. `updateLastWeights(weights)` merges weights into `lastWeights`
4. `deleteWorkout(id)` removes session from history AND recalculates `lastDates` for the affected plan (finds most recent remaining session date, or deletes the key if no sessions remain for that plan)
5. Persist via MMKV with `version: 1` and `migrate` function
6. All tests pass using in-memory storage mock

### workoutStore

7. `startWorkout(plan)` initializes all fields, sets `status: 'active'`, `completedAt: null`
8. `completeSet(weight)` returns `NavigationTarget` computed inside the action (not from stale closures)
   - Uses `getCurrentExercise(state)` (never `queue[0]`) to find the current exercise
   - Removes completed exercise from queue **by ID** (not `queue.slice(1)`)
   - Returns `'rest'` (between sets or between exercises), `'checkpoint'` (all remaining skipped), or `'complete'` (queue empty)
9. `skipExercise()` returns `NavigationTarget` — adds to `skippedIds`, resets `currentSet`/`currentSets`, returns `'checkpoint'` (all remaining skipped) or `'next'` (more non-skipped)
10. `removeExercise(exerciseId?)` returns `NavigationTarget` — accepts optional param (defaults to current exercise via `getCurrentExercise`), removes from queue AND skippedIds, resets `currentSet`/`currentSets` **only if removing the current exercise**, returns `'complete'`/`'checkpoint'`/`'next'`
11. `returnToSkipped(id)` removes from `skippedIds`. Does **NOT** reset `currentSet`/`currentSets` (preserves in-progress set data)
12. `complete()` sets `status: 'completed'`, `completedAt: Date.now()`
13. `reset()` restores all fields to idle defaults (`status: 'idle'`, `completedAt: null`, etc.)
14. Persist via MMKV with `partialize` including: `status`, `activePlan`, `queue`, `skippedIds`, `currentSet`, `currentSets`, `log`, `startedAt`, `completedAt`
15. `version: 1` with `migrate` function set up from day one

### buildWorkoutSession utility

16. `buildWorkoutSession(activePlan, log, startedAt, completedAt)` → `WorkoutSession`
17. ID is **deterministic**: `${activePlan.id}-${startedAt}` cast as `WorkoutId` (enables idempotent saves)
18. Duration uses `completedAt` (not `Date.now()`) for accurate duration on crash-resume
19. `date` uses **local date** (not UTC) — `new Date(startedAt).toLocaleDateString('en-CA')` for YYYY-MM-DD
20. `weight` per `CompletedExercise` = last set's weight (`sets[sets.length - 1]?.weight ?? 0`)

### Test Coverage

21. workoutStore: normal 3-set completion, skip + checkpoint, remove (from exercise and checkpoint), all-skipped, empty queue, returnToSkipped, status transitions, NavigationTarget returns
22. appStore: saveWorkout idempotency, saveWorkout lastDates update, deleteWorkout lastDates recalculation, updateLastWeights merge
23. buildWorkoutSession: deterministic ID, local date, duration calculation, weight extraction

## Out of Scope

- Screen implementations (Track 3, 4)
- UI components
- Navigation logic (handled by screens reading NavigationTarget)

## Technical Context

### Store Interface

```typescript
interface WorkoutState {
  status: 'idle' | 'active' | 'completed'
  activePlan: Plan | null
  queue: Exercise[]
  skippedIds: ExerciseId[]
  currentSet: number
  currentSets: SetRecord[]
  log: ExerciseLog[]
  startedAt: number | null
  completedAt: number | null

  startWorkout(plan: Plan): void
  completeSet(weight: number): NavigationTarget
  skipExercise(): NavigationTarget
  removeExercise(exerciseId?: ExerciseId): NavigationTarget
  returnToSkipped(id: ExerciseId): void
  complete(): void
  reset(): void
}

interface AppState {
  lastWeights: Record<string, number>
  lastDates: Partial<Record<string, string>>
  history: WorkoutSession[]

  saveWorkout(session: WorkoutSession): void
  updateLastWeights(weights: Record<string, number>): void
  deleteWorkout(id: WorkoutId): void
}
```

### Critical Pattern: getCurrentExercise

All store actions use `getCurrentExercise(state.queue, state.skippedIds)` to find the current exercise. This returns the first non-skipped exercise in queue order. Never use `queue[0]` — skipped exercises remain in the queue.

### Critical Pattern: NavigationTarget Return

Actions that mutate state AND affect navigation (`completeSet`, `skipExercise`, `removeExercise`) return `NavigationTarget`. The target is computed from the **post-mutation** state within the same synchronous action. Since MMKV writes are synchronous, there are no race conditions.

### Critical Pattern: Idempotent Save

`saveWorkout` checks `history.some(w => w.id === session.id)` before inserting. Combined with deterministic session IDs (`${planId}-${startedAt}`), this prevents duplicate saves on crash-resume.

### Zustand v5 Conventions

- Middleware order: `persist(devtools(...))`
- MMKV storage adapter from Track 1
- Atomic selectors: `useStore(s => s.field)`, never return new objects
- `useShallow` when multiple values needed
- `partialize` to exclude ephemeral state
- `version` + `migrate` from day one

### noUncheckedIndexedAccess

All array index accesses (`sets[sets.length - 1]`, `sort()[0]`, etc.) return `T | undefined`. Use `?.` or length guards throughout.
