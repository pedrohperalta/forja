import { View, Text } from 'react-native'

import { ConfidenceBadge } from '@/components/import/ConfidenceBadge'

type ExtractedExerciseRowProps = {
  name: string
  category: string
  sets: number
  reps: string
  equipment: string
  confidence: number
}

/** Display-only row showing an extracted exercise with confidence badge. */
export function ExtractedExerciseRow({
  name,
  category,
  sets,
  reps,
  equipment,
  confidence,
}: ExtractedExerciseRowProps): React.JSX.Element {
  return (
    <View className="rounded-lg border border-border bg-surface px-4 py-3">
      {/* Top: name + confidence */}
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

        <ConfidenceBadge confidence={confidence} />
      </View>

      {/* Bottom: sets x reps */}
      <View className="mt-2">
        <Text className="font-display text-[14px] tracking-[0.5px] text-accent">
          {sets} x {reps}
        </Text>
      </View>
    </View>
  )
}
