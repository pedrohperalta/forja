# Spec — Workout Flow Screens

**Track ID:** `workout-flow-screens_20260321`
**Origin:** Forja MVP Solution Design v4
**Tasks:** T-12, T-13, T-14, T-15
**Depends on:** [`zustand-stores_20260321`](../zustand-stores_20260321/spec.md)

## Problem

The core workout experience: exercise input, rest timer, skip/checkpoint flow, and workout completion. These four screens form the workout loop that users interact with during every gym session.

## Acceptance Criteria

### Workout Layout Guard (`src/app/(workout)/_layout.tsx`)

1. If `workoutStore.status === 'idle'`, redirect to Home — prevents deep-linking into workout screens without an active session

### Exercise Screen (`src/app/(workout)/exercise.tsx`)

2. Current exercise derived via `getCurrentExercise(queue, skippedIds)` — never `queue[0]`
3. `WeightInput` uses `key={currentExercise.id}` to force remount on exercise change
4. Weight pre-fill: `currentSets.length > 0 ? currentSets[last]?.weight ?? 0 : lastWeights[exerciseId] ?? 0`
5. `ProgressBar` showing `log.length / activePlan.exercises.length`
6. `SeriesDots` showing `currentSet` of 3
7. "Pular" and "Não vou fazer" buttons only visible when `currentSet === 1`
8. "COMPLETEI A SÉRIE" button disabled when weight is empty or invalid; **double-tap protected** (disabled after first tap until navigation completes)
9. Navigation via `NavigationTarget` from store actions:
   - `'rest'` → `router.push('/(workout)/rest')`
   - `'checkpoint'` → `router.push('/(workout)/checkpoint')`
   - `'complete'` → `router.replace('/(workout)/complete')`
   - `'next'` → do nothing (re-render shows new exercise)
10. **Guards on mount/re-render**:
    - `status === 'completed'` → `router.replace('/(workout)/complete')`
    - `!currentExercise && log.length > 0` → `router.replace('/(workout)/complete')`
    - `!currentExercise && log.length === 0 && queue.length > 0` → `router.replace('/(workout)/checkpoint')` (all skipped, nothing logged — prevents infinite loop)
    - `!currentExercise && log.length === 0 && queue.length === 0` → `router.replace('/')` (truly empty)

### Rest Timer Screen (`src/app/(workout)/rest.tsx`)

11. SVG arc animation driven by Reanimated `useAnimatedProps` on `strokeDashoffset`
12. `useRestTimer(60)` hook returns `{ secondsLeft, progress, isFinished }`
13. Timer complete → haptic success + `router.back()`
14. Last 10s: accent (#C2F000) → danger (#FF453A) color interpolation on arc stroke
15. Countdown 3-2-1: haptic light impact per second
16. "Pular Descanso" → `router.back()`
17. "Ir para exercícios pulados (N)" button: **ONLY shown when `skippedIds.length > 0 && currentSets.length === 0`** — prevents navigating to checkpoint mid-exercise, which would corrupt in-progress set data. Uses `router.replace('/(workout)/checkpoint')`
18. Next exercise preview: shows name of `getCurrentExercise(queue, skippedIds)`

### Checkpoint Screen (`src/app/(workout)/checkpoint.tsx`)

19. `FlashList` of `PendingExerciseCard` (queue filtered by skippedIds)
20. Each card: exercise name, badges (category + equipment), status label, two buttons
21. "FAZER AGORA" → `returnToSkipped(exerciseId)` + `router.replace('/(workout)/exercise')`
22. "NÃO VOU FAZER" → `removeExercise(exerciseId)` → navigate per `NavigationTarget`:
    - `'next'` → `router.replace('/(workout)/exercise')` (non-skipped exercises exist to continue)
    - `'checkpoint'` → stay (re-render, fewer cards)
    - `'complete'` → `router.replace('/(workout)/complete')`
23. Guard: if `queue.length === 0` on mount → `router.replace('/(workout)/complete')`

### Complete Screen (`src/app/(workout)/complete.tsx`)

24. On mount — status-based logic:
    - `status === 'active' && log.length > 0`: call `complete()`, build session via `buildWorkoutSession(activePlan, log, startedAt, completedAt)`, call `saveWorkout(session)` (idempotent), call `updateLastWeights(weights)`
    - `status === 'completed'`: also call `saveWorkout` + `updateLastWeights` (idempotent — handles crash between `complete()` and `saveWorkout`), then reconstruct session for display
    - `log.length === 0`: show "Nenhum exercício completado" message, only offer "VOLTAR AO INÍCIO"
25. Stats grid: exercise count, total sets, duration (3 columns)
26. Exercise summary list (FlashList)
27. "VOLTAR AO INÍCIO" → `reset()` + `router.replace('/')`

### Components

28. `ProgressBar` in `src/components/ProgressBar.tsx`
29. `WeightInput` in `src/components/WeightInput.tsx` — `keyboardType="decimal-pad"`, validates non-negative
30. `SeriesDots` in `src/components/SeriesDots.tsx`
31. `RestTimer` (SVG arc) in `src/components/RestTimer.tsx`
32. `PendingExerciseCard` in `src/components/PendingExerciseCard.tsx`

### Tests

33. Screen tests in `__tests__/screens/` for exercise, rest, checkpoint, complete
34. Component tests colocated with source files

## Out of Scope

- Home and History screens (Track 3)
- Font loading, haptics hook, accessibility audit (Track 5)

## Technical Context

### NavigationTarget Handling per Screen

| Screen | `'rest'` | `'checkpoint'` | `'complete'` | `'next'` |
|--------|----------|----------------|--------------|----------|
| Exercise | push rest | push checkpoint | replace complete | re-render |
| Checkpoint | n/a | stay | replace complete | replace exercise |
| Rest | n/a | n/a | n/a | n/a |
| Complete | n/a | n/a | n/a | n/a |

### Rest Timer Checkpoint Guard

The "Ir para pulados" button is ONLY shown when `currentSets.length === 0`. This is critical because:
- After completing all 3 sets of an exercise, `currentSets` is reset to `[]` — safe to detour
- Between sets (set 1→2, 2→3), `currentSets` has entries — NOT safe (would lose set data via `returnToSkipped`)

### Complete Screen Save Flow

```
mount →
  if status === 'active' && log.length > 0:
    complete()              // sets status='completed', completedAt=Date.now()
    session = buildWorkoutSession(activePlan, log, startedAt, completedAt)
    saveWorkout(session)    // idempotent — checks ID
    updateLastWeights(...)  // extracts last set weight per exercise

  if status === 'completed':
    session = buildWorkoutSession(activePlan, log, startedAt, completedAt)
    saveWorkout(session)    // idempotent — handles crash-after-complete
    updateLastWeights(...)

  if log.length === 0:
    show empty message + reset button
```

### useRestTimer Hook

```typescript
function useRestTimer(durationSeconds: number): {
  secondsLeft: number      // JS state, updates every second (for text display)
  progress: SharedValue<number>  // Reanimated shared value 0→1 (for SVG arc)
  isFinished: boolean       // true when timer reaches 0
}
```

- `progress` drives SVG arc via `useAnimatedProps` on UI thread
- `secondsLeft` drives text display and haptic triggers on JS thread
- "Pular Descanso" simply navigates away — component unmount handles cleanup
