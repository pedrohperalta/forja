import { useEffect, useRef, useState } from 'react'
import { useSharedValue, withTiming, Easing, cancelAnimation } from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'

type UseRestTimerReturn = {
  secondsLeft: number
  progress: SharedValue<number>
  isFinished: boolean
}

/**
 * Countdown timer hook for rest periods.
 *
 * - secondsLeft: JS state updated every second (for text display and haptic triggers)
 * - progress: Reanimated SharedValue animating 0->1 (for SVG arc on UI thread)
 * - isFinished: true when timer reaches 0
 * - Cleanup: interval cleared on unmount
 */
export function useRestTimer(durationSeconds: number): UseRestTimerReturn {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
  const [isFinished, setIsFinished] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reanimated shared value for smooth SVG arc animation (0 -> 1)
  const progress = useSharedValue(0)

  useEffect(() => {
    // Start the animation from 0 to 1 over the full duration
    progress.value = withTiming(1, {
      duration: durationSeconds * 1000,
      easing: Easing.linear,
    })

    // JS-side interval for secondsLeft text display
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Timer complete
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          setIsFinished(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      // Cleanup on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      cancelAnimation(progress)
    }
  }, [durationSeconds, progress])

  return { secondsLeft, progress, isFinished }
}
