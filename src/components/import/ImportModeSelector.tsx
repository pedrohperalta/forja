import { View, Text, Pressable } from 'react-native'

type ImportModeSelectorProps = {
  mode: 'replace' | 'add'
  onModeChange: (mode: 'replace' | 'add') => void
}

/** Explanation text for each mode. */
const MODE_DESCRIPTIONS: Record<'replace' | 'add', string> = {
  replace: 'Arquiva os planos existentes e cria novos',
  add: 'Mantém os planos existentes e adiciona novos',
}

/** Toggle between replace and add import modes with explanation text. */
export function ImportModeSelector({
  mode,
  onModeChange,
}: ImportModeSelectorProps): React.JSX.Element {
  return (
    <View>
      {/* Mode buttons */}
      <View className="flex-row gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Substituir planos existentes"
          onPress={() => onModeChange('replace')}
          className={`flex-1 items-center rounded-pill py-2.5 ${
            mode === 'replace' ? 'bg-accent' : 'border border-border-med bg-surface'
          }`}
        >
          <Text
            className={`font-ui text-[12px] uppercase tracking-[1.5px] ${
              mode === 'replace' ? 'font-semibold text-background' : 'text-text-med'
            }`}
          >
            SUBSTITUIR
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar aos planos"
          onPress={() => onModeChange('add')}
          className={`flex-1 items-center rounded-pill py-2.5 ${
            mode === 'add' ? 'bg-accent' : 'border border-border-med bg-surface'
          }`}
        >
          <Text
            className={`font-ui text-[12px] uppercase tracking-[1.5px] ${
              mode === 'add' ? 'font-semibold text-background' : 'text-text-med'
            }`}
          >
            ADICIONAR
          </Text>
        </Pressable>
      </View>

      {/* Explanation text */}
      <Text className="mt-2 font-ui text-[12px] text-muted">{MODE_DESCRIPTIONS[mode]}</Text>
    </View>
  )
}
