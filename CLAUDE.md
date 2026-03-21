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

## UI Design System

### Typography
- **`font-display` (Bebas Neue)**: ALL titles, hero text, large numbers, stat values, weight displays. Never use `font-bold` or generic bold for display text.
- **`font-ui` (Syne)**: ALL body text, buttons, labels, metadata, section headers. Available weights: Regular, SemiBold, Bold.
- Section labels: `font-ui text-[10px]-[11px] uppercase tracking-[2px]-[3px] text-accent` or `text-muted`
- Hero titles: `font-display text-[36px]-[42px] tracking-[1px] text-text`
- Stat numbers: `font-display text-[28px]-[40px] text-accent`

### Button Shapes
- **All buttons use `rounded-pill`** (100px radius) — never `rounded-md` or `rounded-lg` for buttons
- Primary CTA: `h-[56px] rounded-pill bg-accent` with `text-background` (dark text on lime)
- Secondary: `h-[46px] rounded-pill border border-border-med` with `text-text-med`
- Danger: `rounded-pill border border-danger-dim bg-danger-dim` with `text-danger`
- Disabled CTA: `bg-surface-2` with `text-dim`

### Component Patterns
- **SeriesDots**: elongated pills `w-[26px] h-[5px]` — not tiny circles
- **ProgressBar**: thin `h-[3px]` — not thick 8px
- **RestTimer SVG circle**: `180px` diameter — not 240px
- **Cards**: always include `border border-border` on `bg-surface` backgrounds
- **Stat cards**: `rounded-lg bg-surface` with centered content (number + label)
- **Eyebrow chips**: `rounded-pill bg-accent-dim px-4 py-1.5` with `text-accent`

### Navigation Patterns
- **Back navigation**: integrated Chevron Bar — SVG chevron (20x20, `react-native-svg`) + section label on same row (e.g., `‹ TREINOS`). 44x44 touch target. No standalone back-button rows.
- **No icon libraries**: use `react-native-svg` `<Path>` for all icons (chevrons, arrows, etc.)

### Layout Patterns
- **Sticky bottom CTAs**: buttons pinned to bottom with `border-t border-border bg-background px-6 pb-10 pt-4` (thumb zone)
- **Safe area top**: `pt-14` for content below status bar (not SafeAreaView)
- **Screen padding**: `px-6` horizontal padding on all screens
- **Content/action split**: ScrollView for content + fixed bottom View for actions
- **Exercise screen badges**: `rounded-pill bg-surface-2 px-3 py-1` for category/equipment

### Color Usage
- Accent (`#C2F000`): CTAs, active states, stat numbers, section labels, top weight highlights
- Accent-dim: eyebrow chip backgrounds, subtle accent containers
- Surface/Surface-2: card backgrounds, badge backgrounds, disabled button fills
- Border/Border-med: card outlines, section dividers, secondary button outlines
- Danger: delete actions only — button text, confirmation states
- Warning: skipped exercise actions
- Muted/Dim: secondary text, inactive states, eyebrow labels

### History Card Pattern
- Accent bar `w-[3px] bg-accent` on the left edge of each card
- Collapsed: plan name, focus, date, metadata chips (exercises + duration + top weight)
- Expanded: exercise list with name/sets on left, weight on right; delete action at bottom
- Two-step delete: APAGAR → CONFIRMAR/CANCELAR

## Conductor

This project uses Conductor for track-based development. See `conductor/index.md` for navigation.
