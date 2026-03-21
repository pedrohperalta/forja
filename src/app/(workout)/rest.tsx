import { useEffect } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useRestTimer } from '@/hooks/useRestTimer'
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
    <View className="flex-1 items-center justify-center bg-background px-6">
      {/* Timer */}
      <RestTimer secondsLeft={secondsLeft} progress={progress} />

      {/* Next exercise preview */}
      {nextExercise && (
        <View className="mt-8">
          <Text className="text-center text-sm text-text-med">Próximo exercício</Text>
          <Text className="mt-1 text-center text-lg font-bold text-text">{nextExercise.name}</Text>
        </View>
      )}

      {/* Skip rest button */}
      <Pressable
        className="mt-8 rounded-md border border-border-med px-8 py-3"
        onPress={handleSkipRest}
        accessibilityRole="button"
      >
        <Text className="text-text-med">Pular Descanso</Text>
      </Pressable>

      {/* Go to skipped exercises — guarded */}
      {canGoToCheckpoint && (
        <Pressable
          className="mt-4 rounded-md border border-warning-dim px-6 py-3"
          onPress={handleGoToCheckpoint}
          accessibilityRole="button"
        >
          <Text className="text-warning">Ir para exercícios pulados ({skippedIds.length})</Text>
        </Pressable>
      )}
    </View>
  )
}
