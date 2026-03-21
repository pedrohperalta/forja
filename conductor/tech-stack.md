# Tech Stack — Forja

## Overview

Offline-first mobile app with no backend. All data lives on the device via MMKV with Zustand state management. Built on Expo SDK 55 with mandatory New Architecture (Fabric + TurboModules + JSI). React Compiler handles memoization automatically.

## Languages

| Language   | Version | Usage            |
| ---------- | ------- | ---------------- |
| TypeScript | 5.8+    | Primary language |

## Core Frameworks

| Layer       | Technology                          | Version  | Notes                                              |
| ----------- | ----------------------------------- | -------- | -------------------------------------------------- |
| Runtime     | Expo SDK (managed workflow)         | 55       | React Native 0.83, React 19.2                      |
| JS Engine   | Hermes                              | V1       | Default engine, ~55% faster startup                 |
| Navigation  | Expo Router (file-based)            | ~55.x    | `/src/app` structure, kebab-case routes             |
| State       | Zustand + persist middleware        | 5.x      | Slice pattern, two stores: workout + app            |
| Storage     | react-native-mmkv                   | latest   | 20-30x faster than AsyncStorage, synchronous reads  |
| Animations  | react-native-reanimated             | ^4.2.3   | CSS animations API, shared element transitions       |
| Gestures    | react-native-gesture-handler        | ^2.30.0  | Gesture builder pattern + GestureDetector            |
| SVG         | react-native-svg                    | ^15.x    | Timer arc via useAnimatedProps + strokeDashoffset    |
| Styling     | NativeWind (Tailwind for RN)        | ^4.2.0   | Tailwind CSS syntax, dark mode built-in              |
| Lists       | @shopify/flash-list                 | v2       | New Arch only, auto-sizing, 60fps                    |
| Haptics     | expo-haptics                        | SDK 55   | Timer feedback, button confirmations                 |

## Architecture Decisions

### New Architecture (mandatory)

Expo SDK 55 uses New Architecture exclusively — legacy bridge is removed:
- **JSI** replaces the JSON-serialized bridge (direct JS ↔ C++ communication)
- **Fabric** handles UI rendering with synchronous layout measurements
- **TurboModules** load native functionality lazily, reducing startup time
- ~43% cold start improvement, ~39% rendering speed boost, ~20-30% memory reduction

### React Compiler v1.0

Automatic memoization at build time via Babel plugin. **No need for manual `useMemo`/`useCallback`/`React.memo`** — the compiler inserts cache boundaries per reactive scope. Components must follow Rules of React (no prop mutation, no mutable external state reads during render).

### Development Builds (not Expo Go)

Expo Go is being phased out. **Development builds** are the primary dev workflow:
- Full control over native runtime
- Support for all native libraries and config plugins
- Expo Go cannot handle: push notifications, OAuth, deep linking, native API keys

## Frontend Framework

**React Native 0.83 with Expo SDK 55 + Expo Router**

- Managed workflow (no native code ejection)
- File-based routing via Expo Router with `/src/app` structure
- Typed routes via `experiments.typedRoutes` in app.json
- Native tabs API (platform-specific tab experience)
- Development builds for dev, EAS Build for production

## Backend

**None** — 100% client-side, offline-first. No backend, no external database.

## Storage / Persistence

**react-native-mmkv** via Zustand persist middleware.

MMKV is 20-30x faster than AsyncStorage, supports synchronous reads (no `await`), memory-mapped files, and built-in encryption. Integrated with Zustand via a `StateStorage` adapter.

- `workoutStore`: active workout state, exercise queue, sets, timer, skipped exercises
- `appStore`: last weights, last dates, workout history

### Zustand Persist Configuration

- **`partialize`**: persist only essential state, exclude ephemeral UI state
- **`version` + `migrate`**: set up from day one for schema evolution
- **`merge`**: deep merge for nested objects that evolve across versions
- **Design entities with sync metadata** (`syncStatus`, `version`, timestamps) from the start — even before implementing cloud sync (planned v2)

## Infrastructure / Deployment

- **Development**: Development builds on physical device
- **Production**: EAS Build (Expo Application Services)
- **OTA Updates**: EAS Update with Hermes bytecode diffing (75% smaller downloads)

## Testing Stack

| Layer           | Tool                                   | Version |
| --------------- | -------------------------------------- | ------- |
| Test runner     | Jest via jest-expo                     | 30.x    |
| Component tests | @testing-library/react-native (RNTL)  | 13.x   |
| Router tests    | expo-router/testing-library (built-in) | ~55.x  |
| Store tests     | Zustand `__mocks__/zustand.ts` pattern | —       |
| E2E tests       | Maestro                                | latest  |
| CI E2E          | Maestro Cloud via EAS Workflows        | —       |

## Code Quality Tools

| Tool                   | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| ESLint (flat config)   | Linting via `eslint-config-expo/flat`      |
| Prettier               | Auto-formatting                            |
| Lefthook               | Git hooks (faster than Husky, Go binary)   |
| Zod                    | Runtime validation at API boundaries       |
| React Compiler         | Automatic memoization (Babel plugin)       |

## Key Dependencies

| Package                        | Purpose                                    |
| ------------------------------ | ------------------------------------------ |
| expo (~55.x)                   | App runtime and tooling                    |
| expo-router (~55.x)            | File-based navigation with typed routes    |
| react-native (0.83)            | Mobile framework                           |
| zustand (5.x)                  | State management with persist middleware   |
| react-native-mmkv              | High-performance synchronous KV storage    |
| react-native-reanimated (^4.2) | CSS animations, shared element transitions |
| react-native-worklets          | Worklet runtime (peer dep of reanimated 4) |
| react-native-gesture-handler   | Native thread gesture handling             |
| react-native-svg (~15.x)       | SVG timer arc component                    |
| @shopify/flash-list (v2)       | High-performance lists (New Arch only)     |
| nativewind (^4.2)              | Tailwind CSS for React Native              |
| tailwindcss (^3.4)             | Tailwind CSS engine                        |
| expo-haptics                   | Haptic feedback                            |
| expo-font                      | Custom font loading                        |
| zod                            | Runtime schema validation                  |
| jest-expo (~55.x)              | Test runner preset                         |
| @testing-library/react-native  | Component testing                          |

## References

- [Expo SDK 55 Changelog](https://expo.dev/changelog/sdk-55)
- [React Native 0.83 Release](https://reactnative.dev/blog/2025/12/10/react-native-0.83)
- [Reanimated 4 Stable Release](https://blog.swmansion.com/reanimated-4-stable-release)
- [FlashList v2 (Shopify)](https://shopify.engineering/flashlist-v2)
- [React Compiler v1.0](https://react.dev/blog/2025/10/07/react-compiler-1)
- [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv)
- [Zustand v5 Migration Guide](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5)
- [Expo App Folder Structure Best Practices](https://expo.dev/blog/expo-app-folder-structure-best-practices)
