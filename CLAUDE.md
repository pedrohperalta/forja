# Forja — Project Instructions

## Mandatory Context

Before writing any code, read and follow these files:

- **Tech Stack**: `conductor/tech-stack.md` — all technology choices, versions, and architecture decisions
- **TypeScript Style Guide**: `conductor/code_styleguides/typescript.md` — coding patterns, project structure, naming conventions, Zustand patterns, testing conventions, accessibility, and animation patterns
- **Workflow**: `conductor/workflow.md` — TDD policy (strict), commit strategy, language rules

## Key Rules

- **TDD is strict**: write failing tests first, then implement
- **No manual memoization**: React Compiler handles `useMemo`/`useCallback`/`React.memo`
- **Zustand v5 selectors**: always use atomic selectors or `useShallow` — never return new objects from selectors
- **MMKV for storage**: not AsyncStorage
- **Reanimated 4**: use CSS animations API for state-driven animations, worklets only for gesture-driven
- **NativeWind**: use Tailwind classes via `className`, not `StyleSheet.create` (except perf-critical cases)
- **Path aliases**: use `@/` imports (e.g., `@/components/RestTimer`)
- **Route files only in `src/app/`**: no components, hooks, utils, or tests inside the app directory
- **Tests colocated** with source files, except route tests which go in `__tests__/screens/`
- **Conventional Commits**: `feat:`, `fix:`, `test:`, etc. — push directly to `main`
- **All code and comments in English**, UI text in Portuguese (pt-BR)

## Conductor

This project uses Conductor for track-based development. See `conductor/index.md` for navigation.
