import { View, Text, Pressable } from 'react-native'
import type { Exercise, ExerciseId } from '@/types'

type PendingExerciseCardProps = {
  exercise: Exercise
  onDoNow: (id: ExerciseId) => void
  onRemove: (id: ExerciseId) => void
}

/** Card for a skipped exercise in the checkpoint screen. */
export function PendingExerciseCard({
  exercise,
  onDoNow,
  onRemove,
}: PendingExerciseCardProps): React.JSX.Element {
  return (
    <View className="mb-3 rounded-md border border-border bg-surface p-4">
      {/* Exercise name */}
      <Text className="text-lg font-bold text-text">{exercise.name}</Text>

      {/* Badges */}
      <View className="mt-2 flex-row gap-2">
        <View className="rounded-sm bg-surface-2 px-2 py-1">
          <Text className="text-xs text-text-med">{exercise.category}</Text>
        </View>
        <View className="rounded-sm bg-surface-2 px-2 py-1">
          <Text className="text-xs text-text-med">{exercise.equipment}</Text>
        </View>
      </View>

      {/* Status label */}
      <Text className="mt-2 text-sm text-warning">Pulado</Text>

      {/* Action buttons */}
      <View className="mt-3 flex-row gap-3">
        <Pressable
          className="flex-1 items-center rounded-md bg-accent py-3"
          onPress={() => onDoNow(exercise.id)}
          accessibilityRole="button"
        >
          <Text className="font-bold text-background">FAZER AGORA</Text>
        </Pressable>
        <Pressable
          className="flex-1 items-center rounded-md border border-danger-dim py-3"
          onPress={() => onRemove(exercise.id)}
          accessibilityRole="button"
        >
          <Text className="font-bold text-danger">NÃO VOU FAZER</Text>
        </Pressable>
      </View>
    </View>
  )
}
