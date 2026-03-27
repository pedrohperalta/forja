import { useMemo } from 'react'
import { View, Text, Pressable, LayoutAnimation } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist'

import { usePlanStore } from '@/stores/planStore'
import { useHaptics } from '@/hooks/useHaptics'
import { PlanCard } from '@/components/PlanCard'
import type { Plan, PlanId } from '@/types'

/** Plan list screen — shows all plans with add and delete actions. */
export default function PlansScreen(): React.JSX.Element {
  const allPlans = usePlanStore((s) => s.plans)
  const plans = useMemo(() => allPlans.filter((p) => !p.archived), [allPlans])
  const addPlan = usePlanStore((s) => s.addPlan)
  const removePlan = usePlanStore((s) => s.removePlan)
  const reorderPlans = usePlanStore((s) => s.reorderPlans)
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

  const handleDragEnd = ({ data }: { data: Plan[] }): void => {
    haptics.light()
    reorderPlans(data.map((p) => p.id))
  }

  const renderItem = ({
    item: plan,
    drag,
    isActive,
  }: RenderItemParams<Plan>): React.JSX.Element => (
    <ScaleDecorator>
      <View className="px-6 pb-3">
        <PlanCard
          id={plan.id}
          label={plan.label}
          name={plan.name}
          focus={plan.focus}
          exerciseCount={plan.exercises.length}
          onPress={() => handlePressPlan(plan.id)}
          onDelete={() => handleDeletePlan(plan.id)}
          drag={drag}
          isActive={isActive}
        />
      </View>
    </ScaleDecorator>
  )

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
      {plans.length === 0 ? (
        <View className="flex-1 items-center py-16">
          <Text className="font-ui text-[14px] text-muted">Nenhum plano criado</Text>
        </View>
      ) : (
        <DraggableFlatList
          data={plans}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Sticky bottom CTAs */}
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
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/import')}
          className="mt-3 h-[46px] items-center justify-center rounded-pill border border-border-med"
        >
          <Text className="font-ui text-[12px] uppercase tracking-[2px] text-text-med">
            IMPORTAR TREINO
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
