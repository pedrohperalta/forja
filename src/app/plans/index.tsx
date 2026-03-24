import { View, Text, Pressable, ScrollView, LayoutAnimation } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Path } from 'react-native-svg'

import { usePlanStore } from '@/stores/planStore'
import { useHaptics } from '@/hooks/useHaptics'
import { PlanCard } from '@/components/PlanCard'
import type { PlanId } from '@/types'

/** Plan list screen — shows all plans with add and delete actions. */
export default function PlansScreen(): React.JSX.Element {
  const plans = usePlanStore((s) => s.plans.filter((p) => !p.archived))
  const addPlan = usePlanStore((s) => s.addPlan)
  const removePlan = usePlanStore((s) => s.removePlan)
  const router = useRouter()
  const haptics = useHaptics()

  const handleAddPlan = (): void => {
    haptics.light()
    const id = addPlan('', '')
    router.push({ pathname: '/plans/[id]', params: { id } })
  }

  const handlePressPlan = (id: PlanId): void => {
    router.push({ pathname: '/plans/[id]', params: { id } })
  }

  const handleDeletePlan = (id: PlanId): void => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    haptics.warning()
    removePlan(id)
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 pt-14">
        {/* Chevron bar — back to home */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para treinos"
          onPress={() => router.back()}
          className="mb-4 h-[44px] flex-row items-center"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 19l-7-7 7-7"
              stroke="#8A8A8A"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text className="ml-1 font-ui text-[11px] uppercase tracking-[2px] text-muted">
            TREINOS
          </Text>
        </Pressable>

        {/* Title */}
        <Text className="font-display text-[36px] tracking-[1px] text-text">MEUS PLANOS</Text>
      </View>

      {/* Plan list */}
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {plans.length === 0 ? (
          <View className="items-center py-16">
            <Text className="font-ui text-[14px] text-muted">Nenhum plano criado</Text>
          </View>
        ) : (
          <View className="gap-3 pb-6">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                id={plan.id}
                label={plan.label}
                name={plan.name}
                focus={plan.focus}
                exerciseCount={plan.exercises.length}
                onPress={() => handlePressPlan(plan.id)}
                onDelete={() => handleDeletePlan(plan.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View className="border-t border-border bg-background px-6 pb-10 pt-4">
        <Pressable
          accessibilityRole="button"
          onPress={handleAddPlan}
          className="h-[56px] items-center justify-center rounded-pill bg-accent"
        >
          <Text className="font-ui text-[14px] font-semibold uppercase tracking-[2px] text-background">
            NOVO PLANO
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
