# Spec — Home & History Screens

**Track ID:** `home-history-screens_20260321`
**Origin:** Forja MVP Solution Design v4
**Tasks:** T-11, T-16
**Depends on:** [`zustand-stores_20260321`](../zustand-stores_20260321/spec.md)

## Problem

The user needs a Home screen to start/resume workouts and view which plan is next, and a History screen to review and delete past workouts.

## Acceptance Criteria

### Home Screen (`src/app/index.tsx`)

1. Displays 3 `WorkoutCard` components (one per plan A, B, C)
2. "PRÓXIMO" chip appears on the card with the oldest `lastDates[planId]` (or undefined = never done). Tie-break: A → B → C order
3. `HistoryChip` shown only when `history.length > 0`, displays total count
4. **Resume banner**: shown when `workoutStore.status === 'active'` — tapping navigates to `/(workout)/exercise`
5. **Auto-redirect on `status === 'completed'`**: if the store has `status === 'completed'` on mount, auto-redirect to `/(workout)/complete` to finalize the save (handles crash-after-complete scenario)
6. **Cards disabled**: `WorkoutCard` taps are disabled when `status === 'active'` (prevents starting a new workout while one is active)
7. Tapping an enabled card calls `startWorkout(plan)` then `router.push('/(workout)/exercise')`
8. Screen state is always `idle` — MMKV reads are synchronous, no loading state

### History Screen (`src/app/history.tsx`)

9. `FlashList` of `WorkoutHistoryCard` ordered by `date` descending, secondary sort by `createdAt` descending (for same-date workouts)
10. Each card shows: plan label, plan name, metadata (date, exercise count, duration), exercise+weight summary
11. Inline delete (not modal): tap "APAGAR" → card expands to show confirmation with "CANCELAR" and "APAGAR" buttons
12. `deletingId: WorkoutId | null` local state — only one card shows confirmation at a time
13. `deleteWorkout(id)` recalculates `lastDates` for affected plan (handled by appStore)
14. Empty state: "Nenhum treino registrado" centered message (reachable if user deletes all history while on the screen)

### Components

15. `WorkoutCard` — reusable component in `src/components/WorkoutCard.tsx`
16. `HistoryChip` — reusable component in `src/components/HistoryChip.tsx`
17. `WorkoutHistoryCard` — reusable component in `src/components/WorkoutHistoryCard.tsx`

### Tests

18. Home screen tests in `__tests__/screens/home.test.tsx`:
    - No banner when no active workout
    - Resume banner visible when `status === 'active'`
    - Auto-redirect to complete when `status === 'completed'`
    - Cards disabled during active workout
    - PRÓXIMO chip logic (oldest date, undefined, tie-break)
    - HistoryChip visibility

## Out of Scope

- Workout flow screens (Track 4)
- Font loading, haptics (Track 5)

## Technical Context

### Home Screen Store Selectors

```typescript
// Atomic selectors (Zustand v5)
const status = useWorkoutStore(s => s.status)
const lastDates = useAppStore(s => s.lastDates)
const historyLength = useAppStore(s => s.history.length)
```

### PRÓXIMO Chip Logic

```typescript
function getNextPlanId(lastDates: Partial<Record<string, string>>): PlanId {
  const planIds = ['A', 'B', 'C'] as PlanId[]
  return planIds.sort((a, b) => {
    const dateA = lastDates[a]
    const dateB = lastDates[b]
    if (!dateA && !dateB) return 0  // preserve A→B→C order (stable sort)
    if (!dateA) return -1
    if (!dateB) return 1
    return dateA.localeCompare(dateB)
  })[0]!
}
```

### Resume Banner vs Auto-Redirect

| `status` | Behavior |
|-----------|----------|
| `'idle'` | Normal — cards enabled, no banner |
| `'active'` | Resume banner shown, cards disabled |
| `'completed'` | Auto-redirect to `/(workout)/complete` |

### History Inline Delete Pattern

Two-tap: first tap sets `deletingId`, card expands to show confirmation. Second tap confirms deletion. Cancel collapses. Only one card shows confirmation at a time (setting a new `deletingId` closes the previous). This avoids modals during FlashList scroll (z-index + performance issues).
