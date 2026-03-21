import { TextInput } from 'react-native'

type WeightInputProps = {
  value: string
  onChange: (value: string) => void
  exerciseName: string
  setNumber: number
}

/** Numeric weight input with decimal-pad keyboard and non-negative validation. */
export function WeightInput({
  value,
  onChange,
  exerciseName,
  setNumber,
}: WeightInputProps): React.JSX.Element {
  const handleChangeText = (text: string): void => {
    // Allow empty string (user clearing input)
    if (text === '') {
      onChange('')
      return
    }

    // Validate: must be a valid non-negative number or partial decimal (e.g. "12.")
    const isValidNumber = /^\d+\.?\d*$/.test(text)
    if (!isValidNumber) return

    onChange(text)
  }

  return (
    <TextInput
      testID="weight-input"
      className="h-14 rounded-md border border-border-med bg-surface px-4 text-center text-2xl text-text"
      value={value}
      onChangeText={handleChangeText}
      keyboardType="decimal-pad"
      accessibilityLabel={`Peso para ${exerciseName}, série ${setNumber}`}
      placeholder="0"
      placeholderTextColor="#888888"
    />
  )
}
