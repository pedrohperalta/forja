import { useRef } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'

const TAP_STEP = 1
const HOLD_STEP = 5
const HOLD_DELAY = 300
const REPEAT_INTERVAL = 100

type WeightInputProps = {
  value: string
  onChange: (value: string) => void
  exerciseName: string
  setNumber: number
}

/** Format a weight number — whole numbers without decimals. */
function formatWeight(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

/** Numeric weight input with stepper buttons and decimal-pad keyboard.
 *  Tap = ±1 kg, hold = repeating ±5 kg. */
export function WeightInput({
  value,
  onChange,
  exerciseName,
  setNumber,
}: WeightInputProps): React.JSX.Element {
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const repeatTimer = useRef<ReturnType<typeof setInterval>>(undefined)
  const didHold = useRef(false)
  const runningValue = useRef(0)

  const handleChangeText = (text: string): void => {
    if (text === '') {
      onChange('')
      return
    }

    const isValidNumber = /^\d+\.?\d*$/.test(text)
    if (!isValidNumber) return

    onChange(text)
  }

  const applyStep = (direction: 1 | -1, amount: number): void => {
    const next = Math.max(0, runningValue.current + direction * amount)
    runningValue.current = next
    onChange(formatWeight(next))
  }

  const handlePressIn = (direction: 1 | -1): void => {
    didHold.current = false
    runningValue.current = parseFloat(value) || 0

    holdTimer.current = setTimeout(() => {
      didHold.current = true
      applyStep(direction, HOLD_STEP)

      repeatTimer.current = setInterval(() => {
        applyStep(direction, HOLD_STEP)
      }, REPEAT_INTERVAL)
    }, HOLD_DELAY)
  }

  const handlePressOut = (direction: 1 | -1): void => {
    clearTimeout(holdTimer.current)
    clearInterval(repeatTimer.current)

    if (!didHold.current) {
      applyStep(direction, TAP_STEP)
    }
  }

  return (
    <View className="flex-row items-center gap-3">
      {/* Decrement button */}
      <Pressable
        onPressIn={() => handlePressIn(-1)}
        onPressOut={() => handlePressOut(-1)}
        accessibilityRole="button"
        accessibilityLabel="Diminuir peso"
        className="h-[56px] w-[56px] items-center justify-center rounded-pill border border-border-med bg-surface"
      >
        <Text className="font-display text-[24px] text-text-med">−</Text>
      </Pressable>

      {/* Weight input */}
      <TextInput
        testID="weight-input"
        className="h-[72px] flex-1 rounded-lg border border-border-med bg-surface px-4 text-center font-display text-[40px] text-accent"
        value={value}
        onChangeText={handleChangeText}
        keyboardType="decimal-pad"
        accessibilityLabel={`Peso para ${exerciseName}, série ${setNumber}`}
        placeholder="0"
        placeholderTextColor="#444444"
      />

      {/* Increment button */}
      <Pressable
        onPressIn={() => handlePressIn(1)}
        onPressOut={() => handlePressOut(1)}
        accessibilityRole="button"
        accessibilityLabel="Aumentar peso"
        className="h-[56px] w-[56px] items-center justify-center rounded-pill border border-border-med bg-surface"
      >
        <Text className="font-display text-[24px] text-text-med">+</Text>
      </Pressable>
    </View>
  )
}
