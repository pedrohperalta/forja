# Plan — Plan Integration & Polish

**Track ID:** `plan-integration-polish_20260322`

## Phase 0: UX Research & Design

- [ ] Task 0.1: Dispatch sub-agent as **Senior UI/UX Designer, specialist in Mobile Application development for top Tech Companies**. Research best practices for: empty state patterns in fitness apps, home screen layout with dynamic plan counts, transition from static to user-configured content.
- [ ] Task 0.2: Produce design guidelines for EmptyPlans component, home screen adjustments, and label display patterns
- [ ] Task 0.3: Review design guidelines against Forja's design system

### Checkpoint

- Design guidelines documented and aligned with Forja design system

## Phase 1: Home Screen Integration

- [ ] Task 1.1: Write tests for `EmptyPlans` component — renders empty state message and CTA to create first plan
- [ ] Task 1.2: Create `src/components/EmptyPlans.tsx` — empty state with illustration/message and "Criar Primeiro Plano" CTA navigating to `/plans/`
- [ ] Task 1.3: Rewrite `__tests__/screens/home.test.tsx` — mock `planStore` instead of relying on `PLANS` import. Test: renders plans from planStore, renders EmptyPlans when no plans, "Meus Treinos" button navigates to `/plans/`, "Meus Treinos" disabled during active workout
- [ ] Task 1.4: Update `src/app/index.tsx` — import `usePlanStore` instead of `PLANS`. Seed step: if planStore empty AND appStore.history exists, call `usePlanStore.setState({ plans: Object.values(PLANS), nextLabel: 'D' })`. Render `EmptyPlans` when no plans. Add "Meus Treinos" button with active workout guard. Update `getNextPlanId` call to `getNextPlanId(plans, lastDates)` where `plans` comes from `planStore`.
- [ ] Task 1.5: Update `WorkoutCard` — add `label` prop, display `label + " " + name`

### Checkpoint

- `npx jest __tests__/screens/home` passes
- `npx jest src/components/EmptyPlans` passes
- Home screen renders plans from planStore on device
- "Meus Treinos" button navigates to plan list

## Phase 2: Rest Screen Wiring

- [ ] Task 2.1: Update `__tests__/screens/rest.test.tsx` — test with custom `restSeconds` param (e.g., 90), test fallback to 60 when no param
- [ ] Task 2.2: Update `src/app/(workout)/rest.tsx` — read `restSeconds` from `useLocalSearchParams()`, parse to number with fallback to 60, delete `REST_DURATION_SECONDS` constant, initialize `prevSecondsRef` with parsed value
- [ ] Task 2.3: Update `__tests__/screens/exercise.test.tsx` — verify `handleNavigation` passes `restSeconds` as route param for rest case
- [ ] Task 2.4: Update `src/app/(workout)/exercise.tsx` — `handleNavigation` case `'rest'`: `router.push({ pathname: '/(workout)/rest', params: { restSeconds: String(result.restSeconds) } })`
- [ ] Task 2.5: Add defensive comment in `src/app/(workout)/checkpoint.tsx` rest case — `// Dead code: resolveTarget never returns 'rest'. Kept for type exhaustiveness.`

### Checkpoint

- `npx jest __tests__/screens/rest` passes
- `npx jest __tests__/screens/exercise` passes
- Rest screen uses correct per-exercise duration on device

## Phase 3: History & Label Display

- [ ] Task 3.1: Update `WorkoutHistoryCard` — add `planLabel?: string` prop, display `planLabel — planName` when present, fallback to `planName` only
- [ ] Task 3.2: Update `src/app/history.tsx` — pass `session.planLabel` to `WorkoutHistoryCard`
- [ ] Task 3.3: Update `WorkoutHistoryCard` tests — test with and without `planLabel`

### Checkpoint

- `npx jest src/components/WorkoutHistoryCard` passes
- History cards show label for new sessions, graceful fallback for old ones

## Phase 4: Cleanup

- [ ] Task 4.1: Delete `src/constants/plans.ts`
- [ ] Task 4.2: Delete `src/constants/plans.test.ts`
- [ ] Task 4.3: Remove `PLANS` import from `src/utils/getNextPlanId.ts` (if still present)
- [ ] Task 4.4: Remove `PLANS` / `PLAN_ENTRIES` imports from `src/app/index.tsx` (seed uses inline `Object.values` of a local reference or the seed already ran)
- [ ] Task 4.5: Verify no remaining imports of `PLANS` or `plans.ts` across the codebase

### Checkpoint

- `npx tsc --noEmit` passes
- No references to deleted `plans.ts` remain
- App boots and works without the hardcoded plans file

## Phase 5: Polish

- [ ] Task 5.1: Add haptic feedback (`expo-haptics`) on plan/exercise CRUD actions (create, delete, reorder)
- [ ] Task 5.2: Add layout animations (Reanimated 4 CSS animations) on list item add/remove in plan list and exercise list
- [ ] Task 5.3: Form validation UX polish — inline error messages, shake animation on invalid submit, haptic on validation failure

### Checkpoint

- Haptics fire on CRUD actions
- List animations play smoothly on device

## Phase 6: E2E Test

- [ ] Task 6.1: Write E2E test: create a new plan → add 2 exercises (one with restSeconds=90) → go home → start workout with the new plan → complete a set → verify rest screen shows 90s → complete workout → verify history shows plan label

### Checkpoint

- E2E test passes

## Verification

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npx eslint .` — zero errors
- [ ] `npx jest` — all tests pass
- [ ] App boots, plans load from planStore, full workout flow works
- [ ] Rest screen respects per-exercise rest time
- [ ] Old workout history displays correctly (no planLabel — graceful fallback)
- [ ] New workout history shows plan label
- [ ] Empty state displays for new users with no plans and no history
- [ ] Seed works for existing users (plans appear from PLANS constant)
