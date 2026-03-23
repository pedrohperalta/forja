import { View, Text, Pressable, ScrollView } from 'react-native'

import { MUSCLE_CATEGORIES } from '@/constants/categories'

type CategorySelectorProps = {
  selected: string
  onSelect: (category: string) => void
}

/** Scrollable grid of muscle group pill chips for exercise category selection. */
export function CategorySelector({ selected, onSelect }: CategorySelectorProps): React.JSX.Element {
  return (
    <View>
      <Text className="mb-3 font-ui text-[10px] uppercase tracking-[2px] text-muted">
        CATEGORIA
      </Text>
      <ScrollView horizontal={false} showsVerticalScrollIndicator={false}>
        <View className="flex-row flex-wrap gap-2">
          {MUSCLE_CATEGORIES.map((category) => {
            const isSelected = selected === category
            return (
              <Pressable
                key={category}
                accessibilityRole="button"
                accessibilityLabel={category}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelect(category)}
                className={`rounded-pill px-4 py-2 ${
                  isSelected
                    ? 'border border-accent bg-accent-dim'
                    : 'border border-border bg-surface'
                }`}
              >
                <Text
                  className={`font-ui text-[12px] ${isSelected ? 'text-accent' : 'text-text-med'}`}
                >
                  {category}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
