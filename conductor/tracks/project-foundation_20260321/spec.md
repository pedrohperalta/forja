# Spec — Project Foundation

**Track ID:** `project-foundation_20260321`
**Origin:** Forja MVP Solution Design v4
**Tasks:** T-01, T-02, T-03, T-04, T-05, T-06
**Depends on:** none

## Problem

No project exists yet. Need a fully configured Expo SDK 55 project with all dependencies, tooling, design tokens, type definitions, static data, and storage adapter — the foundation every other track builds on.

## Acceptance Criteria

1. Expo SDK 55 project boots on a physical device via development build
2. `src/app/` structure with Expo Router file-based routing and typed routes
3. All dependencies installed and verified (Zustand 5, MMKV, Reanimated 4, NativeWind 4.2, FlashList v2, expo-haptics, Zod, react-native-svg, gesture-handler)
4. ESLint flat config + Prettier + Lefthook + commitlint configured and enforced
5. Path aliases (`@/`) working in both TypeScript and Metro bundler
6. React Compiler Babel plugin enabled
7. `tailwind.config.ts` with complete Forja design tokens (colors, fonts, radii, shadows)
8. `src/constants/plans.ts` exports 3 hardcoded plans (A, B, C) with 21 exercises total, using branded types
9. `src/types/` exports all shared types: `Brand`, `ExerciseId`, `WorkoutId`, `PlanId`, `SetRecord`, `ExerciseLog`, `NavigationTarget`, `Plan`, `Exercise`, `WorkoutSession`, `CompletedExercise`
10. `src/schemas/` exports Zod schemas for `WorkoutSession`, `SetRecord`, `ExerciseLog`
11. `src/storage/mmkv.ts` exports MMKV `StateStorage` adapter for Zustand persist
12. `src/storage/__mocks__/mmkv.ts` exports in-memory `StateStorage` mock for tests
13. `src/utils/getCurrentExercise.ts` exports the canonical helper
14. `npx tsc --noEmit` passes with zero errors
15. `npx eslint .` passes with zero errors
16. Lefthook pre-commit hook runs lint + format + typecheck

## Out of Scope

- Zustand stores (Track 2)
- Screen implementations (Track 3, 4)
- Font loading, haptics, accessibility (Track 5)
- E2E tests, app icon, EAS Build (Track 6)

## Technical Context

### Type Definitions (`src/types/`)

```typescript
// Branded types (zero runtime cost)
type Brand<K, T> = K & { __brand: T }
type ExerciseId = Brand<string, 'ExerciseId'>
type WorkoutId = Brand<string, 'WorkoutId'>
type PlanId = Brand<string, 'PlanId'>

// Store types
type SetRecord = { weight: number; completedAt: number }
type ExerciseLog = { exerciseId: ExerciseId; name: string; sets: SetRecord[] }

// Navigation
type NavigationTarget =
  | { target: 'rest' }
  | { target: 'checkpoint' }
  | { target: 'complete' }
  | { target: 'next' }

// Domain
type Plan = { id: PlanId; name: string; focus: string; exercises: Exercise[] }
type Exercise = { id: ExerciseId; name: string; category: string; equipment: string; reps: string; sets: number }
type WorkoutSession = {
  id: WorkoutId; planId: PlanId; planName: string; focus: string;
  date: string; durationMinutes: number; exercises: CompletedExercise[];
  syncStatus: 'local' | 'synced' | 'pending'; version: number;
  createdAt: string; updatedAt: string;
}
type CompletedExercise = { name: string; sets: number; weight: number }
```

### getCurrentExercise Helper (`src/utils/`)

```typescript
// THE canonical way to find the current exercise. Never use queue[0] directly.
function getCurrentExercise(queue: Exercise[], skippedIds: ExerciseId[]): Exercise | undefined {
  return queue.find(e => !skippedIds.includes(e.id))
}
```

### Design Tokens (`tailwind.config.ts`)

```javascript
colors: {
  background: '#080808',
  surface: { DEFAULT: '#111111', 2: '#1C1C1C' },
  border: { DEFAULT: '#222222', med: '#333333' },
  accent: { DEFAULT: '#C2F000', dim: 'rgba(194,240,0,0.10)', glow: 'rgba(194,240,0,0.25)' },
  text: { DEFAULT: '#FFFFFF', med: '#AAAAAA' },
  muted: '#888888', dim: '#444444',
  danger: { DEFAULT: '#FF453A', dim: 'rgba(255,69,58,0.10)' },
  warning: { DEFAULT: '#F59E0B', dim: 'rgba(245,158,11,0.15)' },
  info: { DEFAULT: '#3B82F6', dim: 'rgba(59,130,246,0.15)' },
},
fontFamily: { display: ['BebasNeue'], ui: ['Syne'] },
borderRadius: { sm: '8px', md: '12px', lg: '16px', pill: '100px' },
```

### tsconfig Strict Settings

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### Notes

- `noUncheckedIndexedAccess` means every `Record` and array index access returns `T | undefined`. All code must use `?.` or guards.
- `exactOptionalPropertyTypes` means you cannot assign `undefined` to optional properties — must use `delete` or rest destructuring.
- `lastDates` in appStore must be `Partial<Record<string, string>>` to allow key deletion.
- `skippedIds` must be `ExerciseId[]` (branded), not `string[]`.
