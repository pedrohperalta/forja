# Spec — Plan Configuration Screens

**Track ID:** `plan-config-screens_20260322`
**Origin:** Masons Idea `training_configuration`
**Depends on:** [`plan-store-foundation_20260322`](../plan-store-foundation_20260322/spec.md)

## Problem

The plan store (Track 1) provides CRUD operations for plans and exercises, but there are no screens for users to interact with it. Users need a dedicated configuration flow to create plans, add/remove/reorder exercises, set rest times, and manage their training setup.

## Acceptance Criteria

1. Plan list screen at `/plans/` showing all plans from `planStore`, with an "add plan" button
2. Plan detail screen at `/plans/[id]/` showing the plan's exercises with drag-and-drop reordering
3. Exercise form screen at `/plans/[id]/exercise` for creating and editing exercises (edit mode via `exerciseId` query param)
4. `PlanCard` component displaying plan label, name, focus, and exercise count
5. `ExerciseRow` component displaying exercise name, category, sets/reps, rest time, with edit and delete actions
6. `CategorySelector` component with the 12 muscle groups from `MUSCLE_CATEGORIES`
7. `useTwoStepDelete` hook extracted from `WorkoutHistoryCard`'s existing two-step delete pattern (APAGAR → CONFIRMAR/CANCELAR)
8. `react-native-reanimated-dnd` installed and used for exercise reordering
9. Exercise form includes Zod-based validation (required name, positive sets, valid reps range, valid category)
10. Two-step delete on both plans (plan list) and exercises (plan detail)
11. Back navigation uses Chevron Bar pattern (SVG chevron + section label)
12. All buttons use `rounded-pill` shape per design system
13. Screen tests in `__tests__/screens/` for all 3 screens
14. Component tests colocated with source files
15. All screens follow dark industrial aesthetic with `#C2F000` accent

## Out of Scope

- Home screen integration, navigation entry point to `/plans/` (Track 3)
- Wiring `restSeconds` to the rest screen (Track 3)
- Deleting `constants/plans.ts` (Track 3)
- Empty state component (Track 3)
- Haptics and layout animations (Track 3)

## Technical Context

### Route Structure

```
src/app/plans/
  index.tsx          → Plan list (GET /plans/)
  [id]/
    index.tsx        → Plan detail (GET /plans/{id}/)
    exercise.tsx     → Exercise form (GET /plans/{id}/exercise?exerciseId=xxx)
```

- `[id]` is a dynamic Expo Router segment — reads `id` from `useLocalSearchParams()`
- Exercise form uses `exerciseId` as a query param (not a route segment) for edit mode
- Cannot have `[id].tsx` and `[id]/` directory at the same level — use `[id]/index.tsx`

### Drag-and-Drop

- Library: `react-native-reanimated-dnd` (compatible with Reanimated 4 + New Architecture)
- `reorderExercises(planId, orderedIds)` action in `planStore` takes the new order as `ExerciseId[]`
- The drag-and-drop produces a reordered array — extract IDs and pass to the action

### Exercise Form

- New exercises: `Crypto.randomUUID()` from `expo-crypto` generates `ExerciseId`
- Edit mode: `exerciseId` query param present → load existing exercise data from `planStore`
- Validation: Zod schema from `src/schemas/plan.ts` — validate before submitting
- Fields: name, category (selector), equipment, reps (string, e.g., "10-12"), sets (number), restSeconds (number, default 60)

### useTwoStepDelete Hook

Extract from `WorkoutHistoryCard.tsx` which already implements the APAGAR → CONFIRMAR/CANCELAR pattern. The hook should return:
- `deleteState: 'idle' | 'confirming'`
- `requestDelete: () => void` — transitions to confirming
- `confirmDelete: () => void` — executes the deletion
- `cancelDelete: () => void` — returns to idle

### UX Research Phase

Before designing screens, dispatch a sub-agent as a **Senior UI/UX Designer, specialist in Mobile Application development for top Tech Companies**. The agent must research best practices for:
- Workout plan configuration UX in fitness apps
- Drag-and-drop patterns on mobile
- Form design for exercise parameters
- Category/muscle group selection patterns

### Design System Reference

- Fonts: `font-display` (Bebas Neue) for titles/hero, `font-ui` (Syne) for body/buttons
- Section labels: `font-ui text-[10px]-[11px] uppercase tracking-[2px]-[3px] text-accent`
- Primary CTA: `h-[56px] rounded-pill bg-accent text-background`
- Secondary: `h-[46px] rounded-pill border border-border-med text-text-med`
- Danger: `rounded-pill border border-danger-dim bg-danger-dim text-danger`
- Cards: `rounded-lg bg-surface border border-border`
- Back navigation: Chevron Bar (SVG chevron 20x20 + label on same row, 44x44 touch target)
- Sticky bottom CTAs: `border-t border-border bg-background px-6 pb-10 pt-4`
- Screen padding: `px-6`, safe area top: `pt-14`
- No icon libraries — use `react-native-svg` `<Path>` for all icons
