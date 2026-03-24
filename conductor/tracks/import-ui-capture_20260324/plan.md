# Plan — Import UI & Capture Flow

**Track ID:** `import-ui-capture_20260324`
**Status:** [x] Complete

## Phase 1: Shared Components

- [x] Task 1.1: Write tests for `ImportPhotoCard` — renders thumbnail, shows status indicators (pending/processing/done/error), fires onRemove callback
- [x] Task 1.2: Implement `ImportPhotoCard` in `src/components/import/ImportPhotoCard.tsx`
- [x] Task 1.3: Write tests for `ConfidenceBadge` — green/yellow/red thresholds, displays percentage text
- [x] Task 1.4: Implement `ConfidenceBadge` in `src/components/import/ConfidenceBadge.tsx`
- [x] Task 1.5: Write tests for `ExtractedExerciseRow` — display-only: renders name, category, sets×reps, equipment, confidence badge (edit mode added in Track 3)
- [x] Task 1.6: Implement `ExtractedExerciseRow` in `src/components/import/ExtractedExerciseRow.tsx`

### Checkpoint

- `npx tsc --noEmit` passes
- `npx jest src/components/import` passes

## Phase 2: ImportModeSelector

- [x] Task 2.1: Write tests for `ImportModeSelector` — renders replace/add options, fires onModeChange, highlights active mode
- [x] Task 2.2: Implement `ImportModeSelector` in `src/components/import/ImportModeSelector.tsx`

### Checkpoint

- `npx jest src/components/import` passes

## Phase 3: useImportProcessing Hook

- [x] Task 3.1: Write tests for `useImportProcessing` — processes photos sequentially, updates statuses in importStore, aggregates workouts, handles errors per photo, sets `'processing'` status on start, sets `'reviewing'` on completion. Test label auto-generation: reads `usePlanStore.getState().nextLabel` and generates sequential labels (one per photo)
- [x] Task 3.2: Implement `useImportProcessing` in `src/hooks/useImportProcessing.ts` — iterates `importStore.photos`, auto-generates labels from `planStore.nextLabel`, calls `importApi.extractWorkout(uri, label)` for each, updates `importStore.updatePhotoStatus()` and `importStore.setWorkouts()`. Sets `importStore.status` to `'processing'` on start, `'reviewing'` on completion

### Checkpoint

- `npx jest src/hooks/useImportProcessing` passes

## Phase 4: Import Capture Screen

- [x] Task 4.1: Write tests for `ImportCaptureScreen` — renders photo cards, mode selector, PROCESSAR button disabled when no photos, navigates to /import/processing on submit, add button disabled at 5 photos, sets importStore status to `'capturing'` on mount
- [x] Task 4.2: Create route `src/app/import/index.tsx` — `ImportCaptureScreen` with camera capture via `expo-image-picker`, gallery selection, photo card grid (max 5 photos), mode selector, sticky bottom CTA. Sets `importStore.status` to `'capturing'` on mount. Update `app.json` camera permission string to generic: "Tire fotos para adicionar ao Forja"
- [x] Task 4.3: Create route layout `src/app/import/_layout.tsx` — Stack navigator for import flow

### Checkpoint

- `npx jest __tests__/screens/importCapture` passes
- `npx tsc --noEmit` passes

## Phase 5: Import Processing Screen

- [x] Task 5.1: Write tests for `ImportProcessingScreen` — shows progress, displays per-photo status, navigates to /import/review on completion, back navigation is disabled during processing
- [x] Task 5.2: Create route `src/app/import/processing.tsx` — `ImportProcessingScreen` with progress bar, photo status list, uses `useImportProcessing` hook, auto-navigates on success. Disable hardware back via `BackHandler` and hide header back button while processing is in flight

### Checkpoint

- `npx jest __tests__/screens/importProcessing` passes
- `npx tsc --noEmit` passes

## Phase 6: Final Verification & PR

- [x] Task 6.1: Run full test suite — `npx jest` — all tests pass
- [x] Task 6.2: Run typecheck — `npx tsc --noEmit`
- [x] Task 6.3: Create PR with all changes
