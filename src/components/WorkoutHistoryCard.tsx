import { View, Text, Pressable } from 'react-native'
import type { CompletedExercise, PlanId, WorkoutId } from '@/types'

type WorkoutHistoryCardProps = {
  id: WorkoutId
  planId: PlanId
  planName: string
  focus: string
  date: string
  durationMinutes: number
  exercises: CompletedExercise[]
  isDeleting: boolean
  onDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

/** Card displaying a completed workout with inline delete confirmation. */
export function WorkoutHistoryCard({
  id,
  planName,
  focus,
  date,
  durationMinutes,
  exercises,
  isDeleting,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: WorkoutHistoryCardProps): React.JSX.Element {
  return (
    <View className="rounded-lg bg-surface p-4">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-xl text-text">{planName}</Text>
        <Text className="font-ui text-xs text-muted">{date}</Text>
      </View>
      <Text className="mt-1 font-ui text-sm text-text-med">{focus}</Text>

      {/* Metadata */}
      <View className="mt-2 flex-row gap-3">
        <Text className="font-ui text-xs text-muted">
          {exercises.length} exerc.
        </Text>
        <Text className="font-ui text-xs text-muted">{durationMinutes} min</Text>
      </View>

      {/* Exercise summary */}
      <View className="mt-3 gap-1">
        {exercises.map((exercise) => (
          <Text
            key={exercise.name}
            className="font-ui text-xs text-text-med"
          >
            {exercise.name} - {exercise.sets}x {exercise.weight}kg
          </Text>
        ))}
      </View>

      {/* Delete actions */}
      <View className="mt-3 flex-row justify-end gap-2">
        {isDeleting ? (
          <>
            <Pressable
              testID="cancel-delete-button"
              onPress={onCancelDelete}
              accessibilityRole="button"
              accessibilityLabel="Cancelar exclusão"
              className="min-h-[44px] items-center justify-center rounded-pill bg-surface-2 px-4 py-2"
            >
              <Text className="font-ui text-xs font-bold text-text-med">
                CANCELAR
              </Text>
            </Pressable>
            <Pressable
              testID="confirm-delete-button"
              onPress={onConfirmDelete}
              accessibilityRole="button"
              accessibilityLabel="Confirmar exclusão"
              className="min-h-[44px] items-center justify-center rounded-pill bg-danger-dim px-4 py-2"
            >
              <Text className="font-ui text-xs font-bold text-danger">
                CONFIRMAR
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            testID={`delete-workout-button-${id}`}
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel="Apagar treino"
            className="min-h-[44px] items-center justify-center rounded-pill bg-surface-2 px-4 py-2"
          >
            <Text className="font-ui text-xs font-bold text-danger">
              APAGAR
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}
