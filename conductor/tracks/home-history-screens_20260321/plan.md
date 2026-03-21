# Plan — Home & History Screens

**Track ID:** `home-history-screens_20260321`

## Phase 1: Home Screen Tests

- [ ] Task 1.1: Write test — renders 3 WorkoutCards with plan names
- [ ] Task 1.2: Write test — PRÓXIMO chip on correct card (oldest date, undefined, tie-break A→B→C)
- [ ] Task 1.3: Write test — HistoryChip hidden when history empty, visible with count when not
- [ ] Task 1.4: Write test — resume banner visible when status='active', hidden otherwise
- [ ] Task 1.5: Write test — auto-redirect to complete screen when status='completed'
- [ ] Task 1.6: Write test — cards disabled (not tappable) when status='active'
- [ ] Task 1.7: Write test — tapping enabled card calls startWorkout and navigates

## Phase 2: Home Screen Components

- [ ] Task 2.1: Create `src/components/WorkoutCard.tsx` — plan name, focus, last date, PRÓXIMO chip, disabled state
- [ ] Task 2.2: Create `src/components/WorkoutCard.test.tsx` — renders props, disabled state, onPress
- [ ] Task 2.3: Create `src/components/HistoryChip.tsx` — count display, onPress
- [ ] Task 2.4: Create `src/components/HistoryChip.test.tsx`

## Phase 3: Home Screen Implementation

- [ ] Task 3.1: Implement `src/app/index.tsx` — WorkoutCards, PRÓXIMO logic, HistoryChip, resume banner, auto-redirect, disabled cards
- [ ] Task 3.2: Extract `getNextPlanId` helper to `src/utils/getNextPlanId.ts`
- [ ] Task 3.3: Verify all home screen tests pass

## Phase 4: History Screen Tests

- [ ] Task 4.1: Write test — renders list of workouts ordered by date desc
- [ ] Task 4.2: Write test — inline delete: tap APAGAR shows confirmation, tap CONFIRMAR deletes
- [ ] Task 4.3: Write test — inline delete: tap CANCELAR hides confirmation
- [ ] Task 4.4: Write test — empty state shown when no history

## Phase 5: History Screen Components & Implementation

- [ ] Task 5.1: Create `src/components/WorkoutHistoryCard.tsx` — plan info, metadata, exercise summary, delete button, inline confirmation
- [ ] Task 5.2: Create `src/components/WorkoutHistoryCard.test.tsx`
- [ ] Task 5.3: Implement `src/app/history.tsx` — FlashList, deletingId state, empty state
- [ ] Task 5.4: Verify all history screen tests pass

## Verification

- [ ] Home screen tests pass in `__tests__/screens/home.test.tsx`
- [ ] History screen tests pass in `__tests__/screens/history.test.tsx`
- [ ] Component tests pass (colocated)
- [ ] `npx tsc --noEmit` — zero errors
- [ ] Visual check: screens render with NativeWind classes on device
