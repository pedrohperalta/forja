# Spec — Review Screen & Integration

**Track ID:** `import-review-integration_20260324`
**Origin:** Masons Idea `smart_training_import`
**Depends on:** [`import-ui-capture_20260324`](../import-ui-capture_20260324/spec.md)

## Problem

After photos are processed and workouts extracted (Track 2), users need a way to review, edit, and confirm the AI-extracted data before it replaces or extends their training plans. Additionally, the import flow has no entry point — users cannot discover or start the import process from anywhere in the app.

This track builds the review screen where users can inspect and edit extracted exercises, confirm the import, and adds entry points in the plans screen and empty state to initiate the import flow.

## Acceptance Criteria

1. `ImportReviewScreen` at `/import/review` — displays extracted workouts with editable exercise rows, confidence badges, and a "CONFIRMAR IMPORTAÇÃO" CTA
2. Users can tap an `ExtractedExerciseRow` to edit exercise name, category, sets, reps, rest, and equipment inline
3. `updateExtractedExercise(workoutIndex, exerciseIndex, changes)` action in importStore is used for edits
4. "CONFIRMAR IMPORTAÇÃO" calls `importStore.confirmImport()` which triggers `planStore.importPlans()`, then navigates to plans screen
5. Import button added to `src/app/plans/index.tsx` — "IMPORTAR TREINO" secondary button in the header area
6. Import button added to `src/components/EmptyPlans.tsx` — secondary option below "CRIAR PRIMEIRO PLANO"
7. `.env.local` template with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` placeholders
8. All components follow Forja design system
9. All components have unit tests written before implementation (TDD)
10. `npx tsc --noEmit` passes
11. All new + existing tests pass

## Out of Scope

- Data layer types, schemas, stores, API client, Edge Function (Track 1)
- Photo capture/processing screens and components (Track 2)
- lastWeights remapping on import (accepted v1 limitation — new exercises get new UUIDs)

## Technical Context

### Architecture

```
/import/review (ImportReviewScreen)
  ├── Per-workout section
  │   ├── Workout title (plan label)
  │   └── ExtractedExerciseRow[] (editable, with ConfidenceBadge)
  └── Sticky bottom CTA: "CONFIRMAR IMPORTAÇÃO"
        └── importStore.confirmImport()
              └── planStore.importPlans(workouts, mode)

Entry points:
  Plans screen → "IMPORTAR TREINO" button → /import/
  EmptyPlans → "IMPORTAR TREINO" button → /import/
```

### Key Decisions

- **Inline editing** — tapping an exercise row opens editable fields in-place (no modal), using `updateExtractedExercise` action
- **Two-step confirmation** — `confirmImport()` sets status to `'confirmed'`, triggers `planStore.importPlans()`, then screen navigates away and `importStore.reset()` is called
- **Entry points in existing screens** — secondary pill buttons that don't disrupt current UI hierarchy
- **Environment variables** — `.env.local` template for Supabase credentials, referenced by `importApi` service from Track 1
