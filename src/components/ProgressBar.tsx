import { View } from 'react-native'

type ProgressBarProps = {
  current: number
  total: number
}

/** Horizontal progress bar with accessibility support. */
export function ProgressBar({ current, total }: ProgressBarProps): React.JSX.Element {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0

  return (
    <View
      className="h-[2px] w-full rounded-full bg-surface-2"
      role="progressbar"
      accessibilityLabel={`Progresso: ${current} de ${total}`}
      accessibilityValue={{ min: 0, max: total, now: current }}
    >
      <View className="h-full rounded-full bg-accent" style={{ width: `${percentage}%` }} />
    </View>
  )
}
