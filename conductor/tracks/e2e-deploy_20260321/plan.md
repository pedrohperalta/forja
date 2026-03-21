# Plan — E2E Tests & Deployment

**Track ID:** `e2e-deploy_20260321`

## Phase 1: testID Attributes

- [ ] Task 1.1: Add `testID` props to all interactive elements across screens (home, exercise, rest, checkpoint, complete, history)
- [ ] Task 1.2: Verify existing component tests still pass after adding testID props

## Phase 2: Maestro E2E Tests

- [ ] Task 2.1: Install Maestro CLI, create `.maestro/config.yaml`
- [ ] Task 2.2: Write `happy-path.yaml` — full workout flow: home → exercise → 3 sets → rest → complete → home
- [ ] Task 2.3: Write `skip-flow.yaml` — skip exercise → checkpoint → remove → complete
- [ ] Task 2.4: Write `resume-flow.yaml` — start workout → kill app → reopen → resume → continue
- [ ] Task 2.5: Write `history-flow.yaml` — complete workout → history → delete → confirm
- [ ] Task 2.6: Run all 4 flows on device/emulator, verify passing

## Phase 3: App Icon & Splash Screen

- [ ] Task 3.1: Create/source app icon (1024×1024) and adaptive icon layers, place in `assets/images/`
- [ ] Task 3.2: Create splash screen asset with Forja branding (#080808 background, accent logo)
- [ ] Task 3.3: Configure `app.json` — icon, adaptiveIcon, splash screen via expo-splash-screen plugin
- [ ] Task 3.4: Verify icon and splash render correctly on both iOS and Android

## Phase 4: EAS Build Configuration

- [ ] Task 4.1: Run `eas init` if not already initialized, configure `eas.json` with development/preview/production profiles
- [ ] Task 4.2: Run `eas build --profile preview --platform ios` — verify build completes
- [ ] Task 4.3: Run `eas build --profile preview --platform android` — verify build completes

## Verification

- [ ] All 4 Maestro flows pass on device
- [ ] App icon displays correctly on both platforms
- [ ] Splash screen shows Forja branding on launch
- [ ] Preview builds complete for iOS and Android
- [ ] `npx tsc --noEmit` — zero errors
