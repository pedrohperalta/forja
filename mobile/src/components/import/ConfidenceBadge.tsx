import { View, Text } from 'react-native'

type ConfidenceBadgeProps = {
  confidence: number
}

/** Returns badge background class based on confidence threshold. */
function getBadgeBg(confidence: number): string {
  if (confidence >= 0.8) return 'bg-accent-dim'
  if (confidence >= 0.5) return 'bg-warning-dim'
  return 'bg-danger-dim'
}

/** Returns badge text color class based on confidence threshold. */
function getBadgeTextColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-accent'
  if (confidence >= 0.5) return 'text-warning'
  return 'text-danger'
}

/** Color-coded badge showing AI confidence level as percentage. */
export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps): React.JSX.Element {
  const pct = Math.round(confidence * 100)

  return (
    <View
      accessibilityLabel={`Confianca ${pct}%`}
      className={`rounded-pill px-2 py-0.5 ${getBadgeBg(confidence)}`}
    >
      <Text className={`font-ui text-[10px] ${getBadgeTextColor(confidence)}`}>{pct}%</Text>
    </View>
  )
}
