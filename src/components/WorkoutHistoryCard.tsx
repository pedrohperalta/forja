import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'

import { useTwoStepDelete } from '@/hooks/useTwoStepDelete'
import type { CompletedExercise, PlanId, WorkoutId } from '@/types'

type WorkoutHistoryCardProps = {
  id: WorkoutId
  planId: PlanId
  planName: string
  focus: string
  date: string
  durationMinutes: number
  exercises: CompletedExercise[]
  onDelete: () => void
}

/** Compact card displaying a completed workout. Tap to expand details + delete. */
export function WorkoutHistoryCard({
  id,
  planName,
  focus,
  date,
  durationMinutes,
  exercises,
  onDelete,
}: WorkoutHistoryCardProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const { deleteState, requestDelete, confirmDelete, cancelDelete } = useTwoStepDelete(onDelete)

  const handleToggle = (): void => {
    setExpanded((prev) => !prev)
    cancelDelete()
  }

  // Highest weight lifted in this session
  const topWeight =
    exercises.length > 0
      ? exercises.reduce((prev, curr) => (curr.weight > prev.weight ? curr : prev)).weight
      : null

  return (
    <Pressable
      testID={`workout-history-card-${id}`}
      accessibilityRole="button"
      accessibilityLabel={`${planName}, ${focus}, ${durationMinutes} minutos, ${exercises.length} exercícios`}
      onPress={handleToggle}
    >
      <View className="flex-row overflow-hidden rounded-md border border-border bg-surface">
        {/* Accent bar */}
        <View className="w-[3px] bg-accent" />

        {/* Content */}
        <View className="flex-1 px-4 py-3">
          {/* Top row: plan name + date */}
          <View className="flex-row items-baseline justify-between">
            <Text className="font-display text-[20px] tracking-[1px] text-text" numberOfLines={1}>
              {planName}
            </Text>
            <Text className="font-ui text-[11px] tracking-[0.5px] text-dim">{date}</Text>
          </View>

          {/* Focus */}
          <Text className="mt-0.5 font-ui text-[12px] text-muted" numberOfLines={1}>
            {focus}
          </Text>

          {/* Metadata chips */}
          <View className="mt-2 flex-row items-center">
            <Text className="font-display text-[14px] tracking-[0.5px] text-text-med">
              {exercises.length} exerc.
            </Text>
            <View className="mx-2 h-[3px] w-[3px] rounded-full bg-dim" />
            <Text className="font-display text-[14px] tracking-[0.5px] text-text-med">
              {durationMinutes} min
            </Text>
            {topWeight != null ? (
              <>
                <View className="mx-2 h-[3px] w-[3px] rounded-full bg-dim" />
                <Text className="font-display text-[14px] tracking-[0.5px] text-accent">
                  {topWeight}kg
                </Text>
              </>
            ) : null}
          </View>

          {/* Expanded: exercise list + delete */}
          {expanded && (
            <View className="mt-3 border-t border-border pt-4">
              {exercises.map((ex, i) => (
                <View
                  key={`${ex.name}-${i}`}
                  className={`flex-row items-baseline justify-between pb-2 ${i < exercises.length - 1 ? 'mb-2 border-b border-border' : ''}`}
                >
                  {/* Exercise name — primary info */}
                  <View className="mr-4 flex-1">
                    <Text
                      className="font-ui text-[11px] uppercase tracking-[0.8px] text-text-med"
                      numberOfLines={1}
                    >
                      {ex.name}
                    </Text>
                    <Text className="mt-0.5 font-ui text-[10px] tracking-[0.3px] text-muted">
                      {ex.sets} {ex.sets === 1 ? 'série' : 'séries'}
                    </Text>
                  </View>

                  {/* Weight — accent highlight */}
                  <View className="items-end">
                    <Text className="font-display text-[17px] leading-[17px] tracking-[0.5px] text-accent">
                      {ex.weight}
                      <Text className="font-display text-[12px] text-accent">kg</Text>
                    </Text>
                  </View>

                  {/* Combined sets x weight — visually hidden, preserves data format */}
                  <Text className="absolute h-0 w-0 overflow-hidden opacity-0">
                    {`${ex.sets}x ${ex.weight}kg`}
                  </Text>
                </View>
              ))}

              {/* Delete action */}
              <View className="mt-4 border-t border-border pt-3">
                {deleteState === 'confirming' ? (
                  <View className="flex-row gap-3">
                    <Pressable
                      testID="confirm-delete-button"
                      onPress={confirmDelete}
                      accessibilityRole="button"
                      accessibilityLabel="Confirmar exclusão"
                      className="h-[38px] flex-1 items-center justify-center rounded-pill border border-danger bg-danger-dim"
                    >
                      <Text className="font-ui text-[11px] uppercase tracking-[1px] text-danger">
                        CONFIRMAR
                      </Text>
                    </Pressable>
                    <Pressable
                      testID="cancel-delete-button"
                      onPress={cancelDelete}
                      accessibilityRole="button"
                      accessibilityLabel="Cancelar exclusão"
                      className="h-[38px] flex-1 items-center justify-center rounded-pill border border-border"
                    >
                      <Text className="font-ui text-[11px] uppercase tracking-[1px] text-muted">
                        CANCELAR
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    testID="delete-button"
                    onPress={requestDelete}
                    accessibilityRole="button"
                    accessibilityLabel="Apagar treino"
                    className="h-[38px] w-full items-center justify-center rounded-pill border border-border-med bg-surface-2"
                  >
                    <Text className="font-ui text-[11px] uppercase tracking-[1px] text-danger">
                      APAGAR
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  )
}
