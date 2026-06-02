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
    <View className="mb-3 rounded-lg border border-border bg-surface p-5">
      {/* Exercise name */}
      <Text className="font-display text-[22px] tracking-[1px] text-text">{exercise.name}</Text>

      {/* Badges */}
      <View className="mt-2 flex-row gap-2">
        <View className="rounded-pill bg-surface-2 px-3 py-1">
          <Text className="font-ui text-[10px] uppercase tracking-[1px] text-text-med">
            {exercise.category}
          </Text>
        </View>
        <View className="rounded-pill bg-surface-2 px-3 py-1">
          <Text className="font-ui text-[10px] uppercase tracking-[1px] text-text-med">
            {exercise.equipment}
          </Text>
        </View>
      </View>

      {/* Status label */}
      <Text className="mt-3 font-ui text-[11px] uppercase tracking-[1px] text-warning">Pulado</Text>

      {/* Action buttons */}
      <View className="mt-4 flex-row gap-3">
        <Pressable
          className="h-[46px] flex-1 items-center justify-center rounded-pill bg-accent"
          onPress={() => onDoNow(exercise.id)}
          accessibilityRole="button"
          accessibilityLabel={`Fazer ${exercise.name} agora`}
        >
          <Text className="font-ui text-[13px] tracking-[0.5px] text-background">FAZER AGORA</Text>
        </Pressable>
        <Pressable
          className="h-[46px] flex-1 items-center justify-center rounded-pill border border-danger-dim"
          onPress={() => onRemove(exercise.id)}
          accessibilityRole="button"
          accessibilityLabel={`Não vou fazer ${exercise.name}`}
        >
          <Text className="font-ui text-[13px] tracking-[0.5px] text-danger">NÃO VOU FAZER</Text>
        </Pressable>
      </View>
    </View>
  )
}
