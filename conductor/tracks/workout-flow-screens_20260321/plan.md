# Plan — Workout Flow Screens

**Track ID:** `workout-flow-screens_20260321`

## Phase 1: Layout Guard & Shared Components

- [ ] Task 1.1: Create `src/app/(workout)/_layout.tsx` — Stack with headerShown:false, gestures disabled, status='idle' redirect guard
- [ ] Task 1.2: Write test + create `src/components/ProgressBar.tsx` — current/total props, accessibilityRole="progressbar"
- [ ] Task 1.3: Write test + create `src/components/WeightInput.tsx` — keyboardType decimal-pad, non-negative validation, accessibilityLabel
- [ ] Task 1.4: Write test + create `src/components/SeriesDots.tsx` — 3 dots filled/hollow based on currentSet

## Phase 2: Exercise Screen Tests

- [ ] Task 2.1: Write test — shows current exercise name (first non-skipped, not queue[0])
- [ ] Task 2.2: Write test — WeightInput pre-fills from currentSets (between sets) or lastWeights (new exercise)
- [ ] Task 2.3: Write test — "Pular" and "Nao vou fazer" visible only on set 1
- [ ] Task 2.4: Write test — completeSet navigation: rest, checkpoint, complete, next
- [ ] Task 2.5: Write test — guard: status='completed' redirects to complete
- [ ] Task 2.6: Write test — guard: empty queue + log > 0 redirects to complete
- [ ] Task 2.7: Write test — guard: all skipped + empty log + queue > 0 redirects to checkpoint
- [ ] Task 2.8: Write test — double-tap protection on confirm button

## Phase 3: Exercise Screen Implementation

- [ ] Task 3.1: Implement `src/app/(workout)/exercise.tsx` — full screen with guards, NavigationTarget routing, WeightInput key={id}
- [ ] Task 3.2: Verify all exercise screen tests pass

## Phase 4: Rest Timer

- [ ] Task 4.1: Write test + create `src/hooks/useRestTimer.ts` — countdown, progress, isFinished, cleanup on unmount
- [ ] Task 4.2: Write test + create `src/components/RestTimer.tsx` — SVG circle + animated arc via useAnimatedProps
- [ ] Task 4.3: Write test — rest screen: timer completion triggers back navigation
- [ ] Task 4.4: Write test — rest screen: "Ir para pulados" button only shown when skippedIds.length > 0 AND currentSets.length === 0
- [ ] Task 4.5: Implement `src/app/(workout)/rest.tsx` — timer, color transition, haptics, buttons, next exercise preview
- [ ] Task 4.6: Verify all rest timer tests pass

## Phase 5: Checkpoint Screen

- [ ] Task 5.1: Write test + create `src/components/PendingExerciseCard.tsx` — exercise name, badges, two buttons
- [ ] Task 5.2: Write test — checkpoint shows only skipped exercises from queue
- [ ] Task 5.3: Write test — "FAZER AGORA" calls returnToSkipped + navigates to exercise
- [ ] Task 5.4: Write test — "NAO VOU FAZER" calls removeExercise + navigates per target
- [ ] Task 5.5: Write test — queue becomes empty → redirects to complete
- [ ] Task 5.6: Implement `src/app/(workout)/checkpoint.tsx`
- [ ] Task 5.7: Verify all checkpoint tests pass

## Phase 6: Complete Screen

- [ ] Task 6.1: Write test — status='active' with log: saves workout, updates weights, shows stats
- [ ] Task 6.2: Write test — status='completed': also saves (idempotent), shows stats
- [ ] Task 6.3: Write test — empty log: shows message, no save
- [ ] Task 6.4: Write test — "VOLTAR AO INICIO" calls reset + navigates to home
- [ ] Task 6.5: Write test — idempotent save: calling twice doesn't create duplicate
- [ ] Task 6.6: Implement `src/app/(workout)/complete.tsx` — status-based save logic, stats grid, exercise summary, reset button
- [ ] Task 6.7: Verify all complete screen tests pass

## Verification

- [ ] All screen tests pass in `__tests__/screens/`
- [ ] All component tests pass (colocated)
- [ ] `npx tsc --noEmit` — zero errors
- [ ] Full workout flow works on device: home → exercise → rest → (loop) → complete → home
- [ ] Skip flow works: skip → checkpoint → return/remove → complete
- [ ] Crash-resume works at every screen
