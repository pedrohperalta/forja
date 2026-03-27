import { View, Text, Pressable } from 'react-native'

import { useTwoStepDelete } from '@/hooks/useTwoStepDelete'
import type { PlanId } from '@/types'

type PlanCardProps = {
  id: PlanId
  label: string
  name: string
  focus: string
  exerciseCount: number
  onPress: () => void
  onDelete: () => void
  drag?: () => void
  isActive?: boolean
}

/** Card displaying a plan with accent bar, info, and two-step delete. */
export function PlanCard({
  label,
  name,
  focus,
  exerciseCount,
  onPress,
  onDelete,
  drag,
  isActive = false,
}: PlanCardProps): React.JSX.Element {
  const { deleteState, requestDelete, confirmDelete, cancelDelete } = useTwoStepDelete(onDelete)

  const exerciseLabel = exerciseCount === 1 ? 'exercicio' : 'exercicios'

  return (
    <Pressable
      onLongPress={drag}
      delayLongPress={200}
      disabled={isActive}
      className="flex-row overflow-hidden rounded-lg border border-border bg-surface"
      style={isActive ? { opacity: 0.9, transform: [{ scale: 1.03 }] } : undefined}
    >
      {/* Accent bar */}
      <View className="w-[3px] bg-accent" />

      <View className="flex-1 px-4 py-3">
        {/* Top row: label badge + plan name */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name}, ${focus}`}
          onPress={onPress}
        >
          <View className="flex-row items-center gap-3">
            <View className="h-[32px] w-[32px] items-center justify-center rounded-pill bg-accent-dim">
              <Text className="font-display text-[16px] text-accent">{label}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-display text-[20px] tracking-[1px] text-text" numberOfLines={1}>
                {name}
              </Text>
              <Text className="font-ui text-[12px] text-muted" numberOfLines={1}>
                {focus}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Metadata + delete row */}
        <View className="mt-3 flex-row items-center justify-between">
          <Text className="font-ui text-[11px] tracking-[0.5px] text-dim">
            {exerciseCount} {exerciseLabel}
          </Text>

          {deleteState === 'confirming' ? (
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirmar exclusao"
                onPress={confirmDelete}
                className="rounded-pill border border-danger bg-danger-dim px-3 py-1"
              >
                <Text className="font-ui text-[10px] uppercase tracking-[1px] text-danger">
                  CONFIRMAR
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar exclusao"
                onPress={cancelDelete}
                className="rounded-pill border border-border px-3 py-1"
              >
                <Text className="font-ui text-[10px] uppercase tracking-[1px] text-muted">
                  CANCELAR
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Apagar plano"
              onPress={requestDelete}
              className="rounded-pill border border-border-med bg-surface-2 px-3 py-1"
            >
              <Text className="font-ui text-[10px] uppercase tracking-[1px] text-danger">
                APAGAR
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  )
}
