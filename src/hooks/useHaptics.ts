import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

type HapticMethods = {
  success: () => void
  light: () => void
  medium: () => void
  heavy: () => void
  warning: () => void
}

/** Centralized haptic feedback hook. No-ops on web. */
export function useHaptics(): HapticMethods {
  const canVibrate = Platform.OS !== 'web'

  return {
    success: () => {
      if (canVibrate) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    },
    light: () => {
      if (canVibrate) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }
    },
    medium: () => {
      if (canVibrate) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }
    },
    heavy: () => {
      if (canVibrate) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      }
    },
    warning: () => {
      if (canVibrate) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
    },
  }
}
