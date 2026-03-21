import { View, Text, Pressable } from 'react-native'

type WorkoutCardProps = {
  planName: string
  focus: string
  lastDate: string | undefined
  isNext: boolean
  disabled: boolean
  onPress: () => void
}

/** Card displaying a workout plan with optional PROXIMO chip and disabled state. */
export function WorkoutCard({
  planName,
  focus,
  lastDate,
  isNext,
  disabled,
  onPress,
}: WorkoutCardProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`rounded-lg bg-surface p-4 ${disabled ? 'opacity-50' : ''}`}
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-2xl text-text">{planName}</Text>
        {isNext ? (
          <View className="rounded-pill bg-accent px-3 py-1">
            <Text className="font-ui text-xs font-bold text-background">
              PROXIMO
            </Text>
          </View>
        ) : null}
      </View>
      <Text className="mt-1 font-ui text-sm text-text-med">{focus}</Text>
      <Text className="mt-2 font-ui text-xs text-muted">
        {lastDate ?? 'Nunca realizado'}
      </Text>
    </Pressable>
  )
}
