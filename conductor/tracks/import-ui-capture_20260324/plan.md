# Plan — Import UI & Capture Flow

**Track ID:** `import-ui-capture_20260324`

## Phase 1: Shared Components

- [ ] Task 1.1: Write tests for `ImportPhotoCard` — renders thumbnail, shows status indicators (pending/processing/done/error), fires onRemove callback
- [ ] Task 1.2: Implement `ImportPhotoCard` in `src/components/import/ImportPhotoCard.tsx`
- [ ] Task 1.3: Write tests for `ConfidenceBadge` — green/yellow/red thresholds, displays percentage text
- [ ] Task 1.4: Implement `ConfidenceBadge` in `src/components/import/ConfidenceBadge.tsx`
- [ ] Task 1.5: Write tests for `ExtractedExerciseRow` — renders name, category, sets×reps, equipment, confidence badge
- [ ] Task 1.6: Implement `ExtractedExerciseRow` in `src/components/import/ExtractedExerciseRow.tsx`

### Checkpoint

- `npx tsc --noEmit` passes
- `npx jest src/components/import` passes

## Phase 2: ImportModeSelector

- [ ] Task 2.1: Write tests for `ImportModeSelector` — renders replace/add options, fires onModeChange, highlights active mode
- [ ] Task 2.2: Implement `ImportModeSelector` in `src/components/import/ImportModeSelector.tsx`

### Checkpoint

- `npx jest src/components/import` passes

## Phase 3: useImportProcessing Hook

- [ ] Task 3.1: Write tests for `useImportProcessing` — processes photos sequentially, updates statuses in importStore, aggregates workouts, handles errors per photo, sets final status
- [ ] Task 3.2: Implement `useImportProcessing` in `src/hooks/useImportProcessing.ts` — iterates `importStore.photos`, calls `importApi.extractWorkout()` for each, updates `importStore.updatePhotoStatus()` and `importStore.setWorkouts()`

### Checkpoint

- `npx jest src/hooks/useImportProcessing` passes

## Phase 4: Import Capture Screen

- [ ] Task 4.1: Write tests for `ImportCaptureScreen` — renders photo cards, mode selector, PROCESSAR button disabled when no photos, navigates to /import/processing on submit
- [ ] Task 4.2: Create route `src/app/import/index.tsx` — `ImportCaptureScreen` with camera capture via `expo-image-picker`, gallery selection, photo card grid, mode selector, sticky bottom CTA
- [ ] Task 4.3: Create route layout `src/app/import/_layout.tsx` — Stack navigator for import flow

### Checkpoint

- `npx jest __tests__/screens/importCapture` passes
- `npx tsc --noEmit` passes

## Phase 5: Import Processing Screen

- [ ] Task 5.1: Write tests for `ImportProcessingScreen` — shows progress, displays per-photo status, navigates to /import/review on completion
- [ ] Task 5.2: Create route `src/app/import/processing.tsx` — `ImportProcessingScreen` with progress bar, photo status list, uses `useImportProcessing` hook, auto-navigates on success

### Checkpoint

- `npx jest __tests__/screens/importProcessing` passes
- `npx tsc --noEmit` passes

## Phase 6: Final Verification & PR

- [ ] Task 6.1: Run full test suite — `npx jest` — all tests pass
- [ ] Task 6.2: Run typecheck — `npx tsc --noEmit`
- [ ] Task 6.3: Create PR with all changes
