# Plan — Plan Configuration Screens

**Track ID:** `plan-config-screens_20260322`

## Phase 0: UX Research & Design

- [ ] Task 0.1: Dispatch sub-agent as **Senior UI/UX Designer, specialist in Mobile Application development for top Tech Companies**. Research best practices for: workout plan configuration UX in fitness apps, drag-and-drop on mobile, exercise parameter forms, muscle group selection patterns.
- [ ] Task 0.2: Produce design guidelines for the 3 screens (plan list, plan detail, exercise form) — layout, interaction patterns, component hierarchy, edge states (empty list, long names, many exercises)
- [ ] Task 0.3: Review design guidelines against Forja's design system (CLAUDE.md) and adjust

### Checkpoint

- Design guidelines documented and aligned with Forja design system

## Phase 1: Shared Hook & Dependencies

- [ ] Task 1.1: Install `react-native-reanimated-dnd` — `npx expo install react-native-reanimated-dnd`
- [ ] Task 1.2: Write tests for `useTwoStepDelete` hook — idle → requestDelete → confirming → confirmDelete → callback fired; cancelDelete → idle; auto-reset after timeout
- [ ] Task 1.3: Extract `useTwoStepDelete` hook from `WorkoutHistoryCard.tsx` into `src/hooks/useTwoStepDelete.ts`. Refactor `WorkoutHistoryCard` to use the extracted hook.
- [ ] Task 1.4: Verify `WorkoutHistoryCard` tests still pass after refactor

### Checkpoint

- `npx jest src/hooks/useTwoStepDelete` passes
- `npx jest src/components/WorkoutHistoryCard` passes
- `react-native-reanimated-dnd` installed

## Phase 2: Components

- [ ] Task 2.1: Write tests for `CategorySelector` — renders all 12 categories, selection callback, selected state styling
- [ ] Task 2.2: Create `src/components/CategorySelector.tsx` — scrollable list/grid of 12 muscle groups from `MUSCLE_CATEGORIES`, pill-shaped selection chips, `onSelect` callback
- [ ] Task 2.3: Write tests for `PlanCard` — displays label, name, focus, exercise count; tap callback; two-step delete (uses `useTwoStepDelete`)
- [ ] Task 2.4: Create `src/components/PlanCard.tsx` — card with accent bar, plan info, delete action
- [ ] Task 2.5: Write tests for `ExerciseRow` — displays name, category, sets×reps, rest time; edit callback; two-step delete
- [ ] Task 2.6: Create `src/components/ExerciseRow.tsx` — row component with drag handle area, exercise info, edit and delete actions

### Checkpoint

- `npx jest src/components/CategorySelector` passes
- `npx jest src/components/PlanCard` passes
- `npx jest src/components/ExerciseRow` passes

## Phase 3: Plan List Screen

- [ ] Task 3.1: Write screen tests for plans list — renders plans from planStore mock, add button navigates to new plan, empty state (no plans message), delete plan two-step flow
- [ ] Task 3.2: Create `src/app/plans/index.tsx` — reads `planStore.plans` via atomic selectors, renders `PlanCard` list via `FlashList`, "Novo Plano" floating/bottom CTA, Chevron Bar back to home
- [ ] Task 3.3: Verify screen tests pass

### Checkpoint

- `npx jest __tests__/screens/plans` passes
- Screen renders correctly on device

## Phase 4: Plan Detail Screen

- [ ] Task 4.1: Write screen tests for plan detail — renders plan name/focus, exercise list, drag-and-drop reorder calls `reorderExercises`, add exercise button, back navigation
- [ ] Task 4.2: Create `src/app/plans/[id]/index.tsx` — reads plan by ID from `planStore`, renders `ExerciseRow` list with drag-and-drop via `react-native-reanimated-dnd`, "Adicionar Exercício" CTA, edit plan name/focus inline or via modal, Chevron Bar back to plan list
- [ ] Task 4.3: Verify screen tests pass

### Checkpoint

- `npx jest __tests__/screens/planDetail` passes
- Drag-and-drop reordering works on device

## Phase 5: Exercise Form Screen

- [ ] Task 5.1: Write screen tests for exercise form — create mode (empty form, submit creates exercise), edit mode (pre-fills from existing exercise via query param), validation errors (empty name, zero sets), category selector integration
- [ ] Task 5.2: Create `src/app/plans/[id]/exercise.tsx` — exercise form with fields: name, category (`CategorySelector`), equipment, reps, sets (stepper), restSeconds (stepper, default 60). Edit mode: reads `exerciseId` from `useLocalSearchParams()`, loads exercise from planStore. Zod validation before submit. Uses `Crypto.randomUUID()` for new ExerciseId. Chevron Bar back to plan detail.
- [ ] Task 5.3: Verify screen tests pass

### Checkpoint

- `npx jest __tests__/screens/exerciseForm` passes
- Form validation prevents invalid submissions
- Edit mode pre-fills correctly

## Verification

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npx eslint .` — zero errors
- [ ] `npx jest` — all tests pass
- [ ] All 3 screens render correctly on device
- [ ] Drag-and-drop reordering persists after app restart
- [ ] Two-step delete works on both plans and exercises
- [ ] Exercise form validation blocks invalid data
