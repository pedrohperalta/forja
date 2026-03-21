# Plan — Project Foundation

**Track ID:** `project-foundation_20260321`

## Phase 1: Scaffolding

- [ ] Task 1.1: Create Expo SDK 55 project with `npx create-expo-app forja --template blank-typescript`
- [ ] Task 1.2: Restructure to `src/app/` — move `app/` to `src/app/`, update `app.json` main field
- [ ] Task 1.3: Configure `app.json` — set scheme, experiments.typedRoutes, newArchEnabled
- [ ] Task 1.4: Create route group `src/app/(workout)/_layout.tsx` with gestures disabled
- [ ] Task 1.5: Create root `src/app/_layout.tsx` with Stack navigator (headerShown: false)

## Phase 2: Dependencies

- [ ] Task 2.1: Install core deps — `zustand`, `react-native-mmkv`, `zod`
- [ ] Task 2.2: Install UI deps — `nativewind`, `tailwindcss`, `react-native-reanimated`, `react-native-worklets`, `react-native-gesture-handler`, `react-native-svg`, `@shopify/flash-list`, `expo-haptics`, `expo-font`
- [ ] Task 2.3: Install dev deps — `eslint-config-expo`, `prettier`, `lefthook`, `@commitlint/cli`, `@commitlint/config-conventional`, `babel-plugin-module-resolver`, `babel-plugin-react-compiler`
- [ ] Task 2.4: Install test deps — `jest-expo`, `@testing-library/react-native`
- [ ] Task 2.5: Verify all deps resolve — `npx expo install --check`

## Phase 3: Tooling

- [ ] Task 3.1: Configure `tsconfig.json` — strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, path aliases
- [ ] Task 3.2: Configure `babel.config.js` — preset expo, module-resolver alias `@/` → `./src`, react-compiler plugin
- [ ] Task 3.3: Configure `eslint.config.mjs` — flat config with eslint-config-expo/flat + prettier
- [ ] Task 3.4: Configure `.prettierrc`
- [ ] Task 3.5: Configure `lefthook.yml` — pre-commit (lint, format, typecheck), commit-msg (commitlint)
- [ ] Task 3.6: Configure `commitlint.config.js` — conventional commits
- [ ] Task 3.7: Verify: `npx tsc --noEmit` passes, `npx eslint .` passes

## Phase 4: Design Tokens

- [ ] Task 4.1: Create `tailwind.config.ts` with Forja color palette, fontFamily, borderRadius, boxShadow
- [ ] Task 4.2: Configure NativeWind — add preset to tailwind config, update babel config, add `nativewind-env.d.ts`
- [ ] Task 4.3: Verify NativeWind — create a test view with `className="bg-background text-accent"`, confirm it renders correctly

## Phase 5: Types & Schemas

- [ ] Task 5.1: Create `src/types/brand.ts` — Brand utility type
- [ ] Task 5.2: Create `src/types/ids.ts` — ExerciseId, WorkoutId, PlanId
- [ ] Task 5.3: Create `src/types/workout.ts` — SetRecord, ExerciseLog, NavigationTarget, Exercise, Plan, CompletedExercise, WorkoutSession
- [ ] Task 5.4: Create `src/types/index.ts` — barrel export
- [ ] Task 5.5: Create `src/schemas/workout.ts` — Zod schemas for WorkoutSession, SetRecord, ExerciseLog (using safeParse)
- [ ] Task 5.6: Verify: `npx tsc --noEmit` passes with all types

## Phase 6: Data & Storage

- [ ] Task 6.1: Write test for plans data — verify 3 plans, 7 exercises each, all exercises have required fields, IDs are unique
- [ ] Task 6.2: Create `src/constants/plans.ts` — 3 ABC plans with 21 exercises using `satisfies Record<string, Plan>`
- [ ] Task 6.3: Create `src/storage/mmkv.ts` — MMKV instance + StateStorage adapter for Zustand persist
- [ ] Task 6.4: Create `src/storage/__mocks__/mmkv.ts` — in-memory Map-based StateStorage mock
- [ ] Task 6.5: Create `src/utils/getCurrentExercise.ts` — canonical helper function
- [ ] Task 6.6: Write test for getCurrentExercise — returns first non-skipped, returns undefined when all skipped, handles empty queue

## Verification

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npx eslint .` — zero errors
- [ ] `npx jest` — plans + getCurrentExercise tests pass
- [ ] App boots on device via development build
- [ ] Lefthook pre-commit hook runs successfully
