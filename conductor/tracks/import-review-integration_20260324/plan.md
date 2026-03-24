# Plan — Review Screen & Integration

**Track ID:** `import-review-integration_20260324`

## Phase 1: Import Review Screen

- [ ] Task 1.1: Write tests for `ImportReviewScreen` — renders extracted workouts with exercise rows, displays confidence badges, CONFIRMAR button calls confirmImport then navigates to /plans then calls reset, handles empty workouts state
- [ ] Task 1.2: Create route `src/app/import/review.tsx` — `ImportReviewScreen` with per-workout sections, `ExtractedExerciseRow` list, sticky bottom "CONFIRMAR IMPORTAÇÃO" CTA. Confirm handler: `confirmImport()` → `router.replace('/plans')` → `importStore.reset()`
- [ ] Task 1.3: Write tests for inline exercise editing — tapping row enables edit mode, changes call `updateExtractedExercise`, category picker shows `MUSCLE_CATEGORIES`
- [ ] Task 1.4: Implement inline edit mode in `ImportReviewScreen` — editable fields for name, category, sets, reps, rest, equipment

### Checkpoint

- `npx jest __tests__/screens/importReview` passes
- `npx tsc --noEmit` passes

## Phase 2: Entry Points

- [ ] Task 2.1: Write tests for import button in Plans screen — button renders, navigates to /import/
- [ ] Task 2.2: Add "IMPORTAR TREINO" secondary pill button to `src/app/plans/index.tsx` — navigates to `/import/`
- [ ] Task 2.3: Write tests for import button in EmptyPlans — button renders, navigates to /import/
- [ ] Task 2.4: Add "IMPORTAR TREINO" secondary pill button to `src/components/EmptyPlans.tsx` — below existing CTA

### Checkpoint

- `npx jest __tests__/screens/plans` passes
- `npx jest src/components/EmptyPlans` passes

## Phase 3: Final Verification & PR

- [ ] Task 3.1: Run full test suite — `npx jest` — all tests pass
- [ ] Task 3.2: Run typecheck — `npx tsc --noEmit`
- [ ] Task 3.3: Create PR with all changes
