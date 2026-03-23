import { View, Text, Pressable } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { useTwoStepDelete } from '@/hooks/useTwoStepDelete'
import type { ExerciseId } from '@/types'

type ExerciseRowProps = {
  id: ExerciseId
  name: string
  category: string
  equipment: string
  sets: number
  reps: string
  restSeconds: number
  onEdit: () => void
  onDelete: () => void
}

/** Row displaying exercise info with edit and two-step delete actions. */
export function ExerciseRow({
  name,
  category,
  equipment,
  sets,
  reps,
  restSeconds,
  onEdit,
  onDelete,
}: ExerciseRowProps): React.JSX.Element {
  const { deleteState, requestDelete, confirmDelete, cancelDelete } = useTwoStepDelete(onDelete)

  return (
    <View className="rounded-lg border border-border bg-surface px-4 py-3">
      {/* Top: name + edit button */}
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="font-display text-[18px] tracking-[0.5px] text-text" numberOfLines={1}>
            {name}
          </Text>

          {/* Category + equipment badges */}
          <View className="mt-1.5 flex-row gap-2">
            <View className="rounded-pill bg-surface-2 px-3 py-1">
              <Text className="font-ui text-[10px] text-text-med">{category}</Text>
            </View>
            <View className="rounded-pill bg-surface-2 px-3 py-1">
              <Text className="font-ui text-[10px] text-text-med">{equipment}</Text>
            </View>
          </View>
        </View>

        {/* Edit button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Editar exercicio"
          onPress={onEdit}
          className="h-[44px] w-[44px] items-center justify-center"
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M16.474 5.408l2.118 2.117m-.756-3.982L12.109 9.27a2.118 2.118 0 00-.58 1.082L11 13l2.648-.53c.41-.082.786-.283 1.082-.579l5.727-5.727a1.853 1.853 0 10-2.621-2.621z"
              stroke="#8A8A8A"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M19 15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h3"
              stroke="#8A8A8A"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>

      {/* Bottom: sets x reps, rest, delete */}
      <View className="mt-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Text className="font-display text-[14px] tracking-[0.5px] text-accent">
            {sets} x {reps}
          </Text>
          <View className="h-[3px] w-[3px] rounded-full bg-dim" />
          <Text className="font-ui text-[11px] text-dim">{restSeconds}s</Text>
        </View>

        {/* Delete action */}
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
            accessibilityLabel="Apagar exercicio"
            onPress={requestDelete}
            className="rounded-pill border border-border-med bg-surface-2 px-3 py-1"
          >
            <Text className="font-ui text-[10px] uppercase tracking-[1px] text-danger">APAGAR</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}
