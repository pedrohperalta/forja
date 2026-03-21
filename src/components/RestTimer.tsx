import { View, Text } from 'react-native'
import Animated, { useAnimatedProps, interpolateColor } from 'react-native-reanimated'
import { Svg, Circle } from 'react-native-svg'
import type { SharedValue } from 'react-native-reanimated'

type RestTimerProps = {
  secondsLeft: number
  progress: SharedValue<number>
}

const SIZE = 240
const STROKE_WIDTH = 8
const RADIUS = (SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/**
 * SVG circle timer with animated arc and countdown text.
 *
 * - Arc fills from 0 to full via strokeDashoffset driven by progress SharedValue
 * - Color interpolates from accent to danger in last 10 seconds
 * - Countdown text displayed in center
 */
export function RestTimer({ secondsLeft, progress }: RestTimerProps): React.JSX.Element {
  const animatedProps = useAnimatedProps(() => {
    // Progress 0 -> 1 maps to strokeDashoffset from CIRCUMFERENCE -> 0
    const strokeDashoffset = CIRCUMFERENCE * (1 - progress.value)

    // Color interpolation: accent (#C2F000) -> danger (#FF453A) in last portion
    // We use the progress value to drive this (last ~17% = last 10s of 60s)
    const stroke = interpolateColor(
      progress.value,
      [0, 0.83, 1],
      ['#C2F000', '#C2F000', '#FF453A'],
    )

    return {
      strokeDashoffset,
      stroke,
    }
  })

  return (
    <View
      className="items-center justify-center"
      accessibilityLabel={`${secondsLeft} segundos restantes`}
      accessibilityRole="timer"
    >
      <Svg width={SIZE} height={SIZE}>
        {/* Background circle */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="#222222"
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        {/* Animated foreground arc */}
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          rotation={-90}
          origin={`${SIZE / 2}, ${SIZE / 2}`}
          animatedProps={animatedProps}
        />
      </Svg>
      {/* Countdown text overlay */}
      <View className="absolute items-center justify-center">
        <Text className="text-6xl font-bold text-text">{secondsLeft}</Text>
      </View>
    </View>
  )
}
