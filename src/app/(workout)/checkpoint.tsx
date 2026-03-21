import { useEffect } from 'react'
import { View, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { useWorkoutStore } from '@/stores/workoutStore'
import { PendingExerciseCard } from '@/components/PendingExerciseCard'
import type { Exercise, ExerciseId, NavigationTarget } from '@/types'

export default function CheckpointScreen(): React.JSX.Element | null {
  const router = useRouter()

  // Atomic selectors
  const queue = useWorkoutStore((s) => s.queue)
  const skippedIds = useWorkoutStore((s) => s.skippedIds)
  const removeExercise = useWorkoutStore((s) => s.removeExercise)
  const returnToSkipped = useWorkoutStore((s) => s.returnToSkipped)

  // Guard: empty queue -> redirect to complete
  useEffect(() => {
    if (queue.length === 0) {
      router.replace('/(workout)/complete')
    }
  }, [queue.length, router])

  // Filter queue to only show skipped exercises
  const skippedExercises = queue.filter((e) => skippedIds.includes(e.id))

  const handleDoNow = (exerciseId: ExerciseId): void => {
    returnToSkipped(exerciseId)
    router.replace('/(workout)/exercise')
  }

  const handleRemove = (exerciseId: ExerciseId): void => {
    const result: NavigationTarget = removeExercise(exerciseId)

    switch (result.target) {
      case 'next':
        router.replace('/(workout)/exercise')
        break
      case 'complete':
        router.replace('/(workout)/complete')
        break
      case 'checkpoint':
        // Stay — re-render shows fewer cards
        break
      case 'rest':
        // Should not happen from checkpoint
        break
    }
  }

  if (queue.length === 0) return null

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <Text className="mb-4 text-2xl font-bold text-text">Exercícios Pulados</Text>
      <Text className="mb-6 text-sm text-text-med">Escolha fazer agora ou remover do treino</Text>

      <FlashList
        data={skippedExercises}
        renderItem={({ item }: { item: Exercise }) => (
          <PendingExerciseCard exercise={item} onDoNow={handleDoNow} onRemove={handleRemove} />
        )}
        keyExtractor={(item: Exercise) => item.id}
      />
    </View>
  )
}
