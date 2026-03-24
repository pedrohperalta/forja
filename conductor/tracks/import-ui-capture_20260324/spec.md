# Spec — Import UI & Capture Flow

**Track ID:** `import-ui-capture_20260324`
**Origin:** Masons Idea `smart_training_import`
**Depends on:** [`import-data-layer_20260324`](../import-data-layer_20260324/spec.md)

## Problem

With the data layer in place (Track 1), the app still lacks any UI for users to photograph their training programs and trigger AI extraction. There are no import screens, no photo capture/selection components, and no visual feedback during the processing pipeline.

This track builds the capture and processing UI: reusable components for displaying photo status and extracted exercises, the photo capture screen with camera/gallery support, and the processing screen that orchestrates API calls and shows progress.

## Acceptance Criteria

1. `ImportPhotoCard` component — displays photo thumbnail, status indicator (pending/processing/done/error), and remove button
2. `ExtractedExerciseRow` component — shows exercise name, category, sets×reps, equipment, with confidence badge and inline edit support
3. `ConfidenceBadge` component — color-coded badge (green ≥0.8, yellow ≥0.5, red <0.5) showing AI confidence level
4. `ImportModeSelector` component — toggle between 'replace' and 'add' modes with explanation text
5. `useImportProcessing` hook — orchestrates photo processing pipeline: iterates photos, calls `importApi.extractWorkout()` for each, updates `importStore` photo statuses and aggregates workouts
6. `ImportCaptureScreen` at `/import/` — camera capture + gallery picker, displays photo cards, mode selector, "PROCESSAR" CTA
7. `ImportProcessingScreen` at `/import/processing` — progress indicator, photo-by-photo status, auto-navigates to review when complete
8. `useImportProcessing` hook auto-generates sequential labels from `planStore.nextLabel` (e.g., "Treino A", "Treino B") — one per photo
9. `useImportProcessing` hook manages `importStore.status` transitions: sets `'processing'` on start, `'reviewing'` on completion
10. Maximum 5 photos per import session — add button disabled when limit reached
11. Back navigation disabled during processing (hardware back + header back) to prevent partial state
12. All components follow Forja design system: Bebas Neue for titles, Syne for body, pill buttons, dark theme, accent color
13. All components have unit tests written before implementation (TDD)
14. `npx tsc --noEmit` passes
15. All new + existing tests pass

## Out of Scope

- Data layer types, schemas, stores, API client (Track 1: `import-data-layer_20260324`)
- Review screen with exercise editing (Track 3: `import-review-integration_20260324`)
- Entry points in home/plans screens (Track 3)
- Supabase Edge Function (Track 1)

## Technical Context

### Architecture

```
/import/ (ImportCaptureScreen)
  ├── ImportPhotoCard (per photo)
  ├── ImportModeSelector
  └── "PROCESSAR" → navigates to /import/processing

/import/processing (ImportProcessingScreen)
  ├── useImportProcessing hook
  │   ├── iterates importStore.photos
  │   ├── calls importApi.extractWorkout() per photo
  │   └── updates importStore (statuses + workouts)
  └── auto-navigates to /import/review on completion
```

### Key Decisions

- **Routes under `/import/`** — avoids conflict with `/plans/[id]` dynamic route
- **`useImportProcessing` hook** — encapsulates the async processing pipeline, making it testable independently of the screen
- **Camera + Gallery** — uses `expo-image-picker` (already in Expo SDK) for both capture and library selection
- **Sequential processing** — photos processed one at a time to avoid rate limits and provide clear progress feedback
- **Label auto-generation** — hook reads `usePlanStore.getState().nextLabel` and generates sequential labels per photo (Treino A, B, C...)
- **Photo limit** — max 5 photos per import to keep processing time reasonable and avoid rate limits
- **Status ownership** — `useImportProcessing` hook owns `'processing'` → `'reviewing'` transitions; capture screen sets `'capturing'` on mount
- **No navigation on error** — if any photo fails, user stays on processing screen with error state and retry option
- **Back disabled during processing** — hardware back and header back button are disabled while API calls are in flight

### Component Design

- `ImportPhotoCard`: 120×120 thumbnail, status overlay icon, remove button (top-right X)
- `ExtractedExerciseRow`: horizontal layout — name + category on left, sets×reps on right, confidence badge inline
- `ConfidenceBadge`: small pill badge, text shows percentage, colors from design system
- `ImportModeSelector`: two pill buttons side by side, active state with accent background
