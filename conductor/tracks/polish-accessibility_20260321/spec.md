# Spec — Polish & Accessibility

**Track ID:** `polish-accessibility_20260321`
**Origin:** Forja MVP Solution Design v4
**Tasks:** T-17, T-18, T-19
**Depends on:** [`home-history-screens_20260321`](../home-history-screens_20260321/spec.md), [`workout-flow-screens_20260321`](../workout-flow-screens_20260321/spec.md)

## Problem

Screens are functional but missing custom fonts, haptic feedback, and accessibility compliance. These are finishing touches required before E2E testing and deployment.

## Acceptance Criteria

### Font Loading (T-17)

1. `expo-font` loads Bebas Neue (display headings) and Syne (UI text) before app renders
2. `SplashScreen.preventAutoHideAsync()` keeps splash visible until fonts are loaded
3. `SplashScreen.hideAsync()` called after fonts finish loading
4. `fontFamily.display` (`BebasNeue`) and `fontFamily.ui` (`Syne`) work via NativeWind classes (`font-display`, `font-ui`)
5. Font files stored in `assets/fonts/` directory
6. Fallback behavior: app still renders if font loading fails (system font fallback)

### useHaptics Hook (T-18)

7. `src/hooks/useHaptics.ts` exports a hook wrapping `expo-haptics` with named feedback methods
8. Methods: `success()` (NotificationSuccess), `light()` (ImpactLight), `medium()` (ImpactMedium), `heavy()` (ImpactHeavy), `warning()` (NotificationWarning)
9. All methods are no-ops on platforms without haptic support (web, simulator)
10. Used in: rest timer countdown (light per second in last 3s), timer complete (success), set completion button (medium), workout complete (success)

### Accessibility Audit (T-19)

11. All interactive elements have minimum 44×44pt touch targets (iOS HIG / WCAG)
12. Text contrast meets WCAG AA (4.5:1 ratio) — verified against Forja color palette:
    - `#FFFFFF` on `#080808` → 20.4:1 ✓
    - `#AAAAAA` on `#080808` → 10.3:1 ✓
    - `#C2F000` on `#080808` → 12.6:1 ✓
    - `#888888` on `#080808` → 5.5:1 ✓
    - `#444444` on `#080808` → 2.4:1 ✗ (decorative only, not for readable text)
13. `ProgressBar` has `accessibilityRole="progressbar"`, `accessibilityValue={{ min: 0, max: total, now: current }}`
14. `WeightInput` has `accessibilityLabel` describing the exercise name and set number
15. `SeriesDots` has `accessibilityLabel` describing current set (e.g., "Série 2 de 3")
16. `RestTimer` has `accessibilityLabel` with seconds remaining, updated at reasonable intervals (not every frame)
17. All buttons have `accessibilityLabel` matching their visible text or describing their action
18. Screen reader: workout flow is navigable via VoiceOver/TalkBack with logical focus order

## Out of Scope

- Dark/light mode toggle (app is dark-only)
- Internationalization beyond pt-BR
- Screen reader optimization for complex animations (SVG arc)

## Technical Context

### Font Loading Pattern

```typescript
// src/app/_layout.tsx
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [loaded, error] = useFonts({
    BebasNeue: require('../../assets/fonts/BebasNeue-Regular.ttf'),
    Syne: require('../../assets/fonts/Syne-Regular.ttf'),
  })

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync()
    }
  }, [loaded, error])

  if (!loaded && !error) return null

  return <Stack />
}
```

### useHaptics Hook

```typescript
// src/hooks/useHaptics.ts
import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

const isHapticsAvailable = Platform.OS !== 'web'

export function useHaptics() {
  return {
    success: () => isHapticsAvailable && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    light: () => isHapticsAvailable && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    medium: () => isHapticsAvailable && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    heavy: () => isHapticsAvailable && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    warning: () => isHapticsAvailable && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  }
}
```

### Haptic Integration Points

| Location | Trigger | Feedback |
|----------|---------|----------|
| Rest timer last 3s | Each countdown second | `light()` |
| Rest timer complete | Timer reaches 0 | `success()` |
| Set completion | Button press | `medium()` |
| Workout complete | Screen mount | `success()` |

### Touch Target Audit Checklist

- `WorkoutCard` — full card is pressable (well above 44pt)
- `HistoryChip` — pill button, ensure min 44pt height
- `WeightInput` — text input field, standard height
- `SeriesDots` — non-interactive, no target needed
- Set completion button — full width, well above 44pt
- "Pular" / "Não vou fazer" — secondary buttons, ensure 44pt min
- "Pular Descanso" — button on rest screen
- "Ir para pulados" — button on rest screen
- Delete confirmation buttons on history cards
