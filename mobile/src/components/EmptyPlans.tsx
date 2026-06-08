import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'

/** Empty state component shown when planStore has no plans and no history exists. */
export function EmptyPlans(): React.JSX.Element {
  const router = useRouter()

  const handleCreatePlan = (): void => {
    router.push('/plans/')
  }

  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="font-display text-[36px] tracking-[1px] text-text">Sem Treinos</Text>
      <Text className="mt-3 text-center font-ui text-[15px] leading-[22px] text-muted">
        Crie seu primeiro plano de treino para começar.
      </Text>
      <Pressable
        onPress={handleCreatePlan}
        accessibilityRole="button"
        accessibilityLabel="Criar primeiro plano de treino"
        className="mt-8 h-[56px] w-full items-center justify-center rounded-pill bg-accent"
      >
        <Text className="font-ui text-[14px] uppercase tracking-[2px] text-background">
          CRIAR PRIMEIRO PLANO
        </Text>
      </Pressable>
    </View>
  )
}
