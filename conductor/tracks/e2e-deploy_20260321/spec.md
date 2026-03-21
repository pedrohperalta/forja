# Spec — E2E Tests & Deployment

**Track ID:** `e2e-deploy_20260321`
**Origin:** Forja MVP Solution Design v4
**Tasks:** T-20, T-21, T-22
**Depends on:** [`polish-accessibility_20260321`](../polish-accessibility_20260321/spec.md)

## Problem

The app needs end-to-end validation of complete user flows, production-ready branding (app icon + splash screen), and build configuration for deployment via EAS Build.

## Acceptance Criteria

### Maestro E2E Tests (T-20)

1. Maestro installed and configured in project root (`.maestro/` directory)
2. **Flow 1 — Happy path**: Home → tap workout card → complete 3 sets (enter weight, tap confirm) → rest timer → complete → back to home. Verifies stats on complete screen.
3. **Flow 2 — Skip flow**: Start workout → skip exercise → complete remaining → checkpoint screen shows skipped → "NÃO VOU FAZER" → complete. Verifies skip count.
4. **Flow 3 — Resume flow**: Start workout → complete 1 set → kill app → reopen → resume banner visible → tap resume → continue from set 2. Verifies crash-resume works.
5. **Flow 4 — History flow**: Complete a workout → navigate to history → verify workout appears → delete → confirm → verify removed.
6. All flows run successfully on a physical device or emulator via `maestro test`
7. Flows use `testID` attributes for element selection (not text matchers for non-label elements)

### App Icon & Splash Screen (T-21)

8. App icon follows platform guidelines: 1024×1024 source, `expo-image` generates all required sizes
9. Adaptive icon configured for Android (foreground + background layers)
10. Splash screen uses Forja branding: dark background (#080808), accent logo
11. Splash screen configured in `app.json` via `expo-splash-screen` config plugin
12. Icon and splash assets stored in `assets/images/`

### EAS Build Configuration (T-22)

13. `eas.json` configured with three profiles: `development`, `preview`, `production`
14. `development` profile: development build with dev client, internal distribution
15. `preview` profile: production-like build for testing, internal distribution
16. `production` profile: production build for app store submission
17. `eas build --profile preview --platform ios` completes successfully
18. `eas build --profile preview --platform android` completes successfully
19. App version and build number managed in `app.json`

## Out of Scope

- App Store / Play Store submission
- EAS Update (OTA) configuration
- CI/CD pipeline (Maestro Cloud via EAS Workflows)
- Push notifications, deep linking

## Technical Context

### Maestro Flow Structure

```
.maestro/
├── flows/
│   ├── happy-path.yaml
│   ├── skip-flow.yaml
│   ├── resume-flow.yaml
│   └── history-flow.yaml
└── config.yaml
```

### Maestro Flow Example (Happy Path)

```yaml
appId: com.forja.app
---
- launchApp
- tapOn:
    id: "workout-card-A"
- assertVisible: "Série 1 de 3"
- tapOn:
    id: "weight-input"
- inputText: "40"
- tapOn:
    id: "complete-set-button"
- assertVisible: "Descanso"
# ... continue through full flow
```

### EAS Build Profiles

```json
{
  "cli": { "version": ">= 15.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

### testID Convention

All interactive elements that Maestro targets should have `testID` props:
- `workout-card-{planId}` — WorkoutCard on home screen
- `weight-input` — WeightInput on exercise screen
- `complete-set-button` — set completion button
- `skip-button` — "Pular" button
- `skip-rest-button` — "Pular Descanso" on rest screen
- `go-to-skipped-button` — "Ir para pulados" on rest screen
- `back-to-home-button` — "VOLTAR AO INÍCIO" on complete screen
- `resume-banner` — resume banner on home screen
- `history-chip` — history chip on home screen
- `delete-workout-button-{id}` — delete button on history card
- `confirm-delete-button` — confirm deletion button
