import { Text, Pressable } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'

type AccountChipProps = {
  authenticated: boolean
  onPress: () => void
}

/**
 * Top-right header affordance for account/login access. Persistent across
 * empty and populated states so fresh-install users can always reach the
 * login flow without needing workout history first.
 */
export function AccountChip({ authenticated, onPress }: AccountChipProps): React.JSX.Element {
  if (authenticated) {
    return (
      <Pressable
        testID="account-chip"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Conta"
        className="h-[44px] w-[44px] items-center justify-center rounded-full bg-accent-dim"
      >
        <Svg width={18} height={18} viewBox="0 0 16 16" fill="none">
          <Circle cx="8" cy="5" r="3" stroke="#C2F000" strokeWidth={1.2} />
          <Path
            d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5"
            stroke="#C2F000"
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        </Svg>
      </Pressable>
    )
  }

  return (
    <Pressable
      testID="account-chip"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Entrar"
      className="min-h-[44px] flex-row items-center rounded-pill border border-border bg-surface px-4 py-2"
    >
      <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
        <Circle cx="8" cy="5" r="3" stroke="#888888" strokeWidth={1.2} />
        <Path
          d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5"
          stroke="#888888"
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      </Svg>
      <Text className="ml-2 font-ui text-[11px] uppercase tracking-[2px] text-text-med">
        ENTRAR
      </Text>
    </Pressable>
  )
}
