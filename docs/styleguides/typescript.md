# TypeScript Style Guide — Forja

## General

- **TypeScript 5.8+** with strict mode
- **No `any`**: Use `unknown` or proper types
- **Explicit return types**: Required for exported functions, optional for local/inline
- **Prefer `const`**: Use `const` by default, `let` only when reassignment is needed, never `var`
- **Use `satisfies`**: Prefer `satisfies` over `as` for type-checked assertions that preserve literal types

### tsconfig.json Strict Settings

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Naming Conventions

| Element            | Convention       | Example                     |
| ------------------ | ---------------- | --------------------------- |
| Variables          | camelCase        | `currentExercise`           |
| Functions          | camelCase        | `getNextWorkout()`          |
| Components         | PascalCase       | `RestTimer`                 |
| Types              | PascalCase       | `WorkoutSession`            |
| Constants          | UPPER_SNAKE_CASE | `DEFAULT_REST_SECONDS`      |
| Files (components) | PascalCase       | `RestTimer.tsx`             |
| Files (utils)      | camelCase        | `formatDuration.ts`         |
| Files (routes)     | kebab-case       | `workout-detail.tsx`        |
| Directories        | kebab-case       | `workout-store/`            |

## Project Structure

```
src/
  app/                      # Expo Router pages ONLY (file-based routing)
    (tabs)/                 # Tab layout group
      index.tsx             # Home screen
      history.tsx           # History screen
    workout/
      [id].tsx              # Dynamic workout route
    _layout.tsx             # Root layout (fonts, providers, splash)
  components/               # Reusable UI components
    RestTimer.tsx
    RestTimer.test.tsx      # Colocated test
    ExerciseCard.tsx
    ExerciseCard.test.tsx
    SetCard.tsx
  stores/                   # Zustand stores
    workoutStore.ts
    workoutStore.test.ts    # Colocated test
    appStore.ts
    appStore.test.ts
  hooks/                    # Custom hooks
    useRestTimer.ts
    useRestTimer.test.ts
    useHaptics.ts
  types/                    # Shared type definitions
    workout.ts
    plan.ts
  schemas/                  # Zod schemas (runtime validation)
    workout.ts
  constants/                # Static data and config
    plans.ts                # Hardcoded ABC workout plans
  utils/                    # Helper functions
    formatDuration.ts
    formatDuration.test.ts
__tests__/                  # Route/screen tests ONLY (can't put tests in app/)
  screens/
    home.test.tsx
    workout.test.tsx
    history.test.tsx
__mocks__/                  # Jest mocks
  zustand.ts                # Official Zustand mock with store reset
  svgMock.js
.maestro/                   # E2E test flows (Maestro)
  start-workout.yaml
  complete-workout.yaml
```

**Key rules:**
- `src/app/` contains **route files only** — no components, hooks, utils, or tests
- Tests are **colocated** with source files (e.g., `RestTimer.test.tsx` next to `RestTimer.tsx`)
- **Exception**: route/screen tests live in `__tests__/screens/` (Expo Router treats files in `app/` as routes)

## React Native / Expo

- **Functional components only** — no class components
- **Named exports** for components (default export only for Expo Router pages)
- **Hooks**: Prefix custom hooks with `use` (e.g., `useRestTimer`)
- **Props**: Define props as a `type` colocated with the component
- **No manual memoization**: React Compiler handles `useMemo`/`useCallback`/`React.memo` automatically. Only add manual memoization if profiling shows the compiler missed a case.
- **NativeWind**: Use Tailwind classes via `className` prop. Use `StyleSheet.create()` only for performance-critical components or cases NativeWind can't handle.
- **Typed routes**: Enable `experiments.typedRoutes` in app.json for type-safe `<Link>` and `useLocalSearchParams`

## TypeScript Patterns

### Discriminated Unions for Screen State

Model all screen states explicitly — never use the `{ loading, error, data }` anti-pattern:

```typescript
type ScreenState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: Error; retry: () => void }
  | { status: 'success'; data: WorkoutSession[] };
```

### Branded Types for Domain IDs

Prevent accidental ID swaps at the type level (zero runtime cost):

```typescript
type Brand<K, T> = K & { __brand: T };
type ExerciseId = Brand<string, 'ExerciseId'>;
type WorkoutId = Brand<string, 'WorkoutId'>;
```

### Zod for Runtime Validation

Use at API/storage boundaries with `safeParse` (never `parse`):

```typescript
const WorkoutSchema = z.object({
  id: z.string(),
  planId: z.enum(['A', 'B', 'C']),
  startedAt: z.string().datetime(),
});
type Workout = z.infer<typeof WorkoutSchema>;
```

### Use `satisfies` for Config Objects

```typescript
const PLANS = {
  A: { name: 'Peito / Ombros / Tríceps', exercises: [...] },
  B: { name: 'Costas / Bíceps', exercises: [...] },
  C: { name: 'Pernas', exercises: [...] },
} satisfies Record<string, Plan>;
```

## Zustand v5 Conventions

- **One file per store**, slice pattern for large stores
- **Middleware order**: `persist(devtools(immer(...)))` — persist outermost
- **MMKV storage adapter**: Create a `StateStorage` adapter for `createJSONStorage`
- **Atomic selectors**: Always use `useStore(s => s.bears)`, never `useStore(s => ({ bears: s.bears, fish: s.fish }))`  — returning new objects causes infinite re-render loops in v5
- **`useShallow`** when you need multiple values: `useStore(useShallow(s => ({ bears: s.bears, fish: s.fish })))`
- **Auto-generated selectors**: Use `createSelectors` pattern for type-safe `store.use.bears()` hooks
- **`partialize`**: persist only essential state, exclude ephemeral UI state
- **`version` + `migrate`**: set up from day one for schema evolution
- **Design entities with sync metadata** (`syncStatus`, `version`, timestamps) from the start

## Imports

- Group imports in order: React/RN → Expo → External → Internal → Types
- Use path aliases: `@/components/RestTimer`, `@/stores/workoutStore`
- No circular imports

### Path Alias Setup

Both `tsconfig.json` (for TS resolution) and `babel.config.js` (for Metro bundler):

```js
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', { alias: { '@': './src' } }]
    ]
  };
};
```

## Formatting & Linting

- **ESLint flat config** with `eslint-config-expo/flat` + `eslint-plugin-prettier`
- **Prettier** for auto-formatting
- **Lefthook** for git hooks:
  - `pre-commit`: ESLint + Prettier on staged files, TypeScript type-check
  - `commit-msg`: commitlint for Conventional Commits

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: "*.{ts,tsx}"
      run: npx eslint --fix {staged_files}
    format:
      glob: "*.{ts,tsx,json}"
      run: npx prettier --write {staged_files}
    typecheck:
      run: npx tsc --noEmit
commit-msg:
  commands:
    validate:
      run: npx commitlint --edit {1}
```

## Testing

### Stack

- **Jest 30** via `jest-expo@~55.x` — test runner
- **RNTL v13+** (`@testing-library/react-native`) — component tests
- **expo-router/testing-library** — route/navigation tests with `renderRouter`
- **Maestro** — E2E tests (YAML-based, zero in-project deps)

### Conventions

- **Test behavior, not implementation** — query by `getByRole`, `getByText`, `getByLabelText` (never `getByTestId` unless no alternative)
- **Cover 4 screen states**: idle, loading, error, success
- **80%+ coverage** on new code, focus on stores/utils/hooks
- **Store tests**: use Zustand's official `__mocks__/zustand.ts` pattern with `afterEach` reset
- **Test naming**: `*.test.ts` / `*.test.tsx` (not `.spec`)

### Mocking

- **MMKV**: provide in-memory `StateStorage` implementation in tests
- **Reanimated**: `require('react-native-reanimated').setUpTests()` in `jest-setup.ts`
- **SVG imports**: `moduleNameMapper` pointing to `__mocks__/svgMock.js`

## Accessibility

- **Touch targets**: minimum 44x44 points
- **Color contrast**: 4.5:1 ratio minimum
- **Timer**: `accessibilityRole="timer"` with live `accessibilityLabel`
- **Progress ring**: `accessibilityRole="progressbar"` with `accessibilityValue={{ min, max, now }}`
- **Buttons**: `accessibilityRole="button"` with `accessibilityState={{ disabled }}`
- Test with VoiceOver (iOS) and TalkBack (Android)

## Haptics

Centralize in a `useHaptics` hook that respects device capabilities:

- **Timer completion**: `notificationAsync(Success)`
- **Countdown warnings (3-2-1)**: `impactAsync(Light)`
- **Button presses**: `impactAsync(Light)`
- **Selection changes**: `selectionAsync()`
- **Error states**: `notificationAsync(Error)`

## Animation Patterns

### SVG Timer Arc (strokeDashoffset technique)

- `react-native-svg` provides `Circle` component
- `Animated.createAnimatedComponent(Circle)` for animatable version
- `useAnimatedProps` (not `useAnimatedStyle`) drives SVG props on UI thread
- Animate `strokeDashoffset` from circumference → 0 for arc fill effect

### Reanimated 4 CSS Animations

Prefer CSS-compatible declarative API for state-driven animations (modals, accordions, visual feedback). Use `useAnimatedStyle` + shared values only for gesture-driven or frame-by-frame animations.

## References

- [Expo SDK 55 App Structure](https://expo.dev/blog/expo-app-folder-structure-best-practices)
- [Zustand v5 Migration](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5)
- [Typed Routes](https://docs.expo.dev/router/reference/typed-routes/)
- [Reanimated 4 Docs](https://docs.swmansion.com/react-native-reanimated/)
- [RNTL Best Practices](https://callstack.github.io/react-native-testing-library/)
- [Maestro Docs](https://maestro.mobile.dev/)
- [React Compiler](https://react.dev/blog/2025/10/07/react-compiler-1)
