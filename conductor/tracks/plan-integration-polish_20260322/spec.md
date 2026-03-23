# Spec — Plan Integration & Polish

**Track ID:** `plan-integration-polish_20260322`
**Origin:** Masons Idea `training_configuration`
**Depends on:** [`plan-config-screens_20260322`](../plan-config-screens_20260322/spec.md)

## Problem

The plan store (Track 1) and configuration screens (Track 2) exist but are disconnected from the rest of the app. The home screen still reads from hardcoded `PLANS`, the rest screen ignores per-exercise rest times, and there's no entry point to the configuration flow. This track wires everything together, handles the transition from hardcoded to dynamic plans, and adds polish.

## Acceptance Criteria

1. Home screen reads plans from `planStore` instead of hardcoded `PLANS`
2. "Meus Treinos" button on home screen navigates to `/plans/`
3. Active workout guard: "Meus Treinos" button disabled/hidden when a workout is active
4. Seed step: if `planStore` is empty AND `appStore.history` has entries, seed `planStore` directly via `setState` with `PLANS` constant (preserving original PlanIds), set `nextLabel='D'`
5. `EmptyPlans` component shown when `planStore.plans` is empty (no history — truly new user)
6. `exercise.tsx` `handleNavigation` passes `restSeconds` as route param: `router.push({ pathname: '/(workout)/rest', params: { restSeconds: String(result.restSeconds) } })`
7. `rest.tsx` reads `restSeconds` from `useLocalSearchParams()`, parses to number with fallback to 60, deletes `REST_DURATION_SECONDS` constant, initializes `prevSecondsRef` with dynamic value
8. `WorkoutCard` displays `Plan.label + " " + Plan.name` (e.g., "A Treino de Peito")
9. `WorkoutHistoryCard` displays `planLabel` when present (e.g., "A — Treino de Peito"), falls back gracefully for old sessions without `planLabel`
10. `history.tsx` passes `session.planLabel` to `WorkoutHistoryCard`
11. `src/constants/plans.ts` and `plans.test.ts` deleted
12. All PLANS imports removed from `getNextPlanId.ts` and `index.tsx`
13. `home.test.tsx` rewritten to mock `planStore`
14. Haptic feedback on plan/exercise CRUD actions
15. Layout animations on list add/remove
16. E2E test covering: create plan → add exercise → start workout → verify rest time
17. `getNextPlanId` call updated to use `planStore.plans`
18. Orphaned `lastDates` entries ignored (getNextPlanId only considers plans in the array)

## Out of Scope

- Plan store implementation (Track 1)
- Configuration screens (Track 2)

## Technical Context

### Seed Strategy

The seed preserves existing user data continuity:
- **Condition**: `planStore.plans.length === 0 && appStore.history.length > 0`
- **Action**: `usePlanStore.setState({ plans: Object.values(PLANS), nextLabel: 'D' })`
- **Why direct setState**: preserves original PlanIds (`'A'`, `'B'`, `'C'`) so `lastDates` entries still match
- **Timing**: runs once on home screen mount, before the PLANS constant is deleted
- After seeding, `PLANS` import can be safely removed

### Rest Screen Wiring

```typescript
// exercise.tsx — handleNavigation, case 'rest':
router.push({
  pathname: '/(workout)/rest',
  params: { restSeconds: String(result.restSeconds) }
})

// rest.tsx
const { restSeconds: restSecondsParam } = useLocalSearchParams<{ restSeconds?: string }>()
const restSeconds = restSecondsParam ? parseInt(restSecondsParam, 10) : 60
```

- `checkpoint.tsx` rest case is dead code (resolveTarget never returns rest) — add defensive comment only
- `prevSecondsRef` must be initialized with the parsed `restSeconds` value, not the deleted constant

### WorkoutCard Label Display

```typescript
// Template for display:
`${plan.label} ${plan.name}`  // e.g., "A Treino de Peito"

// WorkoutHistoryCard (old sessions may lack planLabel):
`${session.planLabel ? `${session.planLabel} — ` : ''}${session.planName}`
```

- `planLabel` prop on `WorkoutHistoryCard` must be declared as `planLabel?: string` (not `string | undefined`) due to `exactOptionalPropertyTypes`

### UX Research Phase

Before designing the empty state and home screen adjustments, dispatch a sub-agent as a **Senior UI/UX Designer**. Research:
- Empty state patterns in fitness/productivity apps
- Home screen information hierarchy with dynamic plan counts
- Transition patterns when switching from static to user-configured content
