import { View, Text, Pressable } from 'react-native'

type HistoryChipProps = {
  count: number
  onPress: () => void
}

/** Chip displaying "Historico" label with a count badge. Navigates to history screen. */
export function HistoryChip({
  count,
  onPress,
}: HistoryChipProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center rounded-pill bg-surface-2 px-4 py-2"
    >
      <Text className="font-ui text-sm text-text-med">Historico</Text>
      <View className="ml-2 h-5 w-5 items-center justify-center rounded-full bg-accent">
        <Text className="font-ui text-xs font-bold text-background">
          {count}
        </Text>
      </View>
    </Pressable>
  )
}
