import { View, Text, Pressable } from 'react-native'
import type { PlanId } from '@/types'

type WorkoutCardProps = {
  planId: PlanId
  planName: string
  focus: string
  lastDate: string | undefined
  isNext: boolean
  disabled: boolean
  onPress: () => void
}

/** Card displaying a workout plan with optional PRÓXIMO chip and disabled state. */
export function WorkoutCard({
  planId,
  planName,
  focus,
  lastDate,
  isNext,
  disabled,
  onPress,
}: WorkoutCardProps): React.JSX.Element {
  return (
    <Pressable
      testID={`workout-card-${planId}`}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${planName}, ${focus}`}
      accessibilityState={{ disabled }}
      className={`overflow-hidden rounded-lg border bg-surface px-5 pb-5 pt-4 ${disabled ? 'opacity-50' : ''} ${isNext ? 'border-accent/30 bg-accent-dim' : 'border-border'}`}
    >
      {/* Accent top bar for next workout */}
      {isNext ? <View className="absolute left-0 right-0 top-0 h-[2px] bg-accent" /> : null}

      <View className="flex-row items-center justify-between">
        <Text className="font-display text-[22px] tracking-[1px] text-text">{planName}</Text>
        {isNext ? (
          <View className="rounded-pill bg-accent/15 px-3 py-1">
            <Text className="font-ui text-[10px] uppercase tracking-[2px] text-accent">
              PRÓXIMO
            </Text>
          </View>
        ) : null}
      </View>
      <Text className="mt-1 font-ui text-[13px] text-text-med">{focus}</Text>
      <Text className="mt-3 font-ui text-[11px] tracking-[0.5px] text-muted">
        {lastDate ?? 'Nunca realizado'}
      </Text>
    </Pressable>
  )
}
