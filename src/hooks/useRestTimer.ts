import { useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
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
 * - Uses Date.now() as source of truth so backgrounding the app doesn't desync text and arc
 * - Listens to AppState to restart animation from the correct position on foreground restore
 */
export function useRestTimer(durationSeconds: number): UseRestTimerReturn {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
  const [isFinished, setIsFinished] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number>(Date.now())

  // Reanimated shared value for smooth SVG arc animation (0 -> 1)
  const progress = useSharedValue(0)

  function startAnimation(fromProgress: number, remainingMs: number) {
    cancelAnimation(progress)
    progress.value = fromProgress
    progress.value = withTiming(1, {
      duration: remainingMs,
      easing: Easing.linear,
    })
  }

  function startInterval() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startedAtRef.current) / 1000
      const remaining = Math.max(0, durationSeconds - Math.floor(elapsed))
      setSecondsLeft(remaining)
      if (remaining <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setIsFinished(true)
      }
    }, 500)
  }

  useEffect(() => {
    startedAtRef.current = Date.now()
    startAnimation(0, durationSeconds * 1000)
    startInterval()

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const elapsed = (Date.now() - startedAtRef.current) / 1000
        const remainingSeconds = Math.max(0, durationSeconds - elapsed)

        if (remainingSeconds <= 0) {
          setSecondsLeft(0)
          setIsFinished(true)
          return
        }

        const fromProgress = 1 - remainingSeconds / durationSeconds
        startAnimation(fromProgress, remainingSeconds * 1000)
        startInterval()
        setSecondsLeft(Math.floor(remainingSeconds))
      } else if (nextState === 'background') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    })

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      cancelAnimation(progress)
      subscription.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationSeconds])

  return { secondsLeft, progress, isFinished }
}
