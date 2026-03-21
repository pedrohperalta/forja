# Plan — Polish & Accessibility

**Track ID:** `polish-accessibility_20260321`

## Phase 1: Font Loading

- [ ] Task 1.1: Add font files to `assets/fonts/` (Bebas Neue Regular, Syne Regular)
- [ ] Task 1.2: Update `src/app/_layout.tsx` — add `useFonts`, `SplashScreen.preventAutoHideAsync()`, hide after load
- [ ] Task 1.3: Verify NativeWind `font-display` and `font-ui` classes render correct fonts on device

## Phase 2: useHaptics Hook

- [ ] Task 2.1: Write test + create `src/hooks/useHaptics.ts` — success, light, medium, heavy, warning methods
- [ ] Task 2.2: Write test — methods are no-ops when Platform.OS === 'web'
- [ ] Task 2.3: Integrate haptics into rest timer (light on last 3s countdown, success on complete)
- [ ] Task 2.4: Integrate haptics into exercise screen (medium on set completion)
- [ ] Task 2.5: Integrate haptics into complete screen (success on mount)

## Phase 3: Accessibility — Components

- [ ] Task 3.1: `ProgressBar` — add `accessibilityRole="progressbar"`, `accessibilityValue`
- [ ] Task 3.2: `WeightInput` — add `accessibilityLabel` with exercise name and set number
- [ ] Task 3.3: `SeriesDots` — add `accessibilityLabel` (e.g., "Série 2 de 3")
- [ ] Task 3.4: `RestTimer` — add `accessibilityLabel` with seconds remaining
- [ ] Task 3.5: All buttons — verify `accessibilityLabel` matches visible text or action

## Phase 4: Accessibility — Touch Targets & Contrast

- [ ] Task 4.1: Audit all interactive elements for 44×44pt minimum touch targets, fix any violations
- [ ] Task 4.2: Verify `dim` color (#444444) is not used for readable text — only decorative/borders
- [ ] Task 4.3: VoiceOver walkthrough of full workout flow — verify logical focus order

## Verification

- [ ] Fonts render correctly on physical device
- [ ] Haptic feedback triggers at all integration points
- [ ] Component tests pass with accessibility props
- [ ] `npx tsc --noEmit` — zero errors
- [ ] VoiceOver full flow: home → exercise → rest → complete — navigable
