import { View, Text, Pressable } from 'react-native'

type HistoryChipProps = {
  count: number
  onPress: () => void
}

/** Chip displaying "Historico" label with a count badge. Navigates to history screen. */
export function HistoryChip({ count, onPress }: HistoryChipProps): React.JSX.Element {
  return (
    <Pressable
      testID="history-chip"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Historico, ${count} treinos`}
      className="min-h-[44px] flex-row items-center rounded-pill border border-border bg-surface px-4 py-2"
    >
      <Text className="font-ui text-[13px] tracking-[0.5px] text-text-med">Historico</Text>
      <View className="ml-2 h-[20px] w-[20px] items-center justify-center rounded-full bg-accent">
        <Text className="font-ui text-[10px] text-background">{count}</Text>
      </View>
    </Pressable>
  )
}
