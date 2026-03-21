# Plan — Zustand Stores (TDD)

**Track ID:** `zustand-stores_20260321`

## Phase 1: appStore Tests

- [ ] Task 1.1: Write test — `saveWorkout` adds session to history and updates `lastDates[planId]`
- [ ] Task 1.2: Write test — `saveWorkout` is idempotent (duplicate ID is a no-op)
- [ ] Task 1.3: Write test — `updateLastWeights` merges new weights into existing
- [ ] Task 1.4: Write test — `deleteWorkout` removes session and recalculates `lastDates` (most recent remaining)
- [ ] Task 1.5: Write test — `deleteWorkout` removes `lastDates` key when no sessions remain for that plan
- [ ] Task 1.6: Write test — `deleteWorkout` with non-existent ID is a no-op
- [ ] Task 1.7: Write test — store rehydrates from MMKV mock correctly

## Phase 2: appStore Implementation

- [ ] Task 2.1: Create `src/stores/appStore.ts` with Zustand v5 + persist middleware + MMKV adapter
- [ ] Task 2.2: Implement `saveWorkout` — idempotent check + history push + lastDates update
- [ ] Task 2.3: Implement `updateLastWeights` — merge into existing Record
- [ ] Task 2.4: Implement `deleteWorkout` — remove from history + recalculate lastDates (use rest destructuring for key deletion with exactOptionalPropertyTypes)
- [ ] Task 2.5: Configure persist: version 1, migrate identity, partialize
- [ ] Task 2.6: Verify all appStore tests pass

## Phase 3: workoutStore Tests

- [ ] Task 3.1: Write test — `startWorkout` initializes all fields with status='active'
- [ ] Task 3.2: Write test — `completeSet` mid-exercise (set 1→2) returns `{target:'rest'}`, increments currentSet
- [ ] Task 3.3: Write test — `completeSet` last set of exercise returns `{target:'rest'}` when more non-skipped exist, logs exercise, removes from queue by ID
- [ ] Task 3.4: Write test — `completeSet` last set of last exercise returns `{target:'complete'}`
- [ ] Task 3.5: Write test — `completeSet` last set when all remaining are skipped returns `{target:'checkpoint'}`
- [ ] Task 3.6: Write test — `skipExercise` adds to skippedIds, resets currentSet/currentSets, returns correct target
- [ ] Task 3.7: Write test — `skipExercise` when last non-skipped returns `{target:'checkpoint'}`
- [ ] Task 3.8: Write test — `removeExercise()` (no param) removes current exercise, returns correct target
- [ ] Task 3.9: Write test — `removeExercise(id)` (with param) removes specific exercise from checkpoint
- [ ] Task 3.10: Write test — `removeExercise` resets currentSet/currentSets only when removing current exercise
- [ ] Task 3.11: Write test — `returnToSkipped` removes from skippedIds, does NOT reset currentSet/currentSets
- [ ] Task 3.12: Write test — `complete()` sets status='completed' and completedAt
- [ ] Task 3.13: Write test — `reset()` restores all fields to idle defaults
- [ ] Task 3.14: Write test — store rehydrates from MMKV mock correctly (all partialize fields)

## Phase 4: workoutStore Implementation

- [ ] Task 4.1: Create `src/stores/workoutStore.ts` with Zustand v5 + persist + MMKV
- [ ] Task 4.2: Implement `startWorkout`
- [ ] Task 4.3: Implement `completeSet` — use getCurrentExercise, return NavigationTarget, remove by ID
- [ ] Task 4.4: Implement `skipExercise` — return NavigationTarget
- [ ] Task 4.5: Implement `removeExercise` — optional param, return NavigationTarget
- [ ] Task 4.6: Implement `returnToSkipped` — no currentSet/currentSets reset
- [ ] Task 4.7: Implement `complete` and `reset`
- [ ] Task 4.8: Configure persist: version 1, partialize (status, activePlan, queue, skippedIds, currentSet, currentSets, log, startedAt, completedAt)
- [ ] Task 4.9: Verify all workoutStore tests pass

## Phase 5: buildWorkoutSession Utility

- [ ] Task 5.1: Write test — deterministic ID is `${planId}-${startedAt}`
- [ ] Task 5.2: Write test — duration uses completedAt (not Date.now())
- [ ] Task 5.3: Write test — date is local date (not UTC)
- [ ] Task 5.4: Write test — weight per exercise is last set's weight
- [ ] Task 5.5: Create `src/utils/buildWorkoutSession.ts`
- [ ] Task 5.6: Verify all tests pass

## Verification

- [ ] `npx jest --coverage` — 80%+ coverage on stores and utilities
- [ ] `npx tsc --noEmit` — zero errors
- [ ] All NavigationTarget returns verified in tests
- [ ] Idempotent save verified
- [ ] lastDates recalculation verified for both save and delete
