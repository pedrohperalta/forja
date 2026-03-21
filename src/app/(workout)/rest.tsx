import { useEffect, useRef } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useRestTimer } from '@/hooks/useRestTimer'
import { useHaptics } from '@/hooks/useHaptics'
import { RestTimer } from '@/components/RestTimer'
import { getCurrentExercise } from '@/utils/getCurrentExercise'

const REST_DURATION_SECONDS = 60

export default function RestScreen(): React.JSX.Element {
  const router = useRouter()

  // Atomic selectors
  const queue = useWorkoutStore((s) => s.queue)
  const skippedIds = useWorkoutStore((s) => s.skippedIds)
  const currentSets = useWorkoutStore((s) => s.currentSets)

  // Rest timer hook
  const { secondsLeft, progress, isFinished } = useRestTimer(REST_DURATION_SECONDS)

  // Haptic feedback
  const haptics = useHaptics()
  const prevSecondsRef = useRef(REST_DURATION_SECONDS)

  // Light haptic on last 3 seconds countdown, success on complete
  useEffect(() => {
    if (secondsLeft !== prevSecondsRef.current) {
      if (secondsLeft > 0 && secondsLeft <= 3) {
        haptics.light()
      }
      if (secondsLeft === 0 && prevSecondsRef.current > 0) {
        haptics.success()
      }
      prevSecondsRef.current = secondsLeft
    }
  }, [secondsLeft, haptics])

  // Next exercise preview
  const nextExercise = getCurrentExercise(queue, skippedIds)

  // Show "Ir para pulados" ONLY when skipped exercises exist AND no in-progress sets
  const canGoToCheckpoint = skippedIds.length > 0 && currentSets.length === 0

  // Timer complete -> navigate back
  useEffect(() => {
    if (isFinished) {
      router.back()
    }
  }, [isFinished, router])

  const handleSkipRest = (): void => {
    router.back()
  }

  const handleGoToCheckpoint = (): void => {
    router.replace('/(workout)/checkpoint')
  }

  return (
    <View className="flex-1 bg-background px-6">
      {/* Centered content — timer is the star */}
      <View className="flex-1 items-center justify-center">
        {/* Eyebrow label */}
        <Text className="mb-8 font-ui text-[11px] uppercase tracking-[4px] text-muted">
          DESCANSO
        </Text>

        {/* Timer */}
        <RestTimer secondsLeft={secondsLeft} progress={progress} />

        {/* Next exercise preview */}
        {nextExercise && (
          <View className="mt-10">
            <Text className="text-center font-ui text-[11px] uppercase tracking-[3px] text-muted">
              PRÓXIMO
            </Text>
            <Text className="mt-2 text-center font-display text-[22px] tracking-[1px] text-text">
              {nextExercise.name}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom actions — thumb zone */}
      <View className="pb-10">
        <Pressable
          testID="skip-rest-button"
          className="h-[46px] w-full items-center justify-center rounded-pill border border-border-med"
          onPress={handleSkipRest}
          accessibilityRole="button"
          accessibilityLabel="Pular Descanso"
        >
          <Text className="font-ui text-[13px] text-text-med">Pular Descanso</Text>
        </Pressable>

        {/* Go to skipped exercises — guarded */}
        {canGoToCheckpoint && (
          <Pressable
            testID="go-to-skipped-button"
            className="mt-3 h-[46px] w-full items-center justify-center rounded-pill border border-warning-dim"
            onPress={handleGoToCheckpoint}
            accessibilityRole="button"
            accessibilityLabel={`Ir para exercícios pulados, ${skippedIds.length} pendentes`}
          >
            <Text className="font-ui text-[13px] text-warning">
              Ir para pulados ({skippedIds.length})
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}
