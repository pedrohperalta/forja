import { useEffect } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'

import { useWorkoutStore } from '@/stores/workoutStore'
import { useAppStore } from '@/stores/appStore'
import { usePlanStore } from '@/stores/planStore'
import { PLANS } from '@/constants/plans'
import { getNextPlanId } from '@/utils/getNextPlanId'
import { WorkoutCard } from '@/components/WorkoutCard'
import { HistoryChip } from '@/components/HistoryChip'
import { EmptyPlans } from '@/components/EmptyPlans'
import type { Plan } from '@/types'

export default function HomeScreen() {
  const router = useRouter()

  // Atomic selectors (Zustand v5)
  const status = useWorkoutStore((s) => s.status)
  const startWorkout = useWorkoutStore((s) => s.startWorkout)
  const lastDates = useAppStore((s) => s.lastDates)
  const historyLength = useAppStore((s) => s.history.length)

  // Plans from planStore instead of hardcoded constant
  const plans = usePlanStore((s) => s.plans)

  // Seed step: if planStore is empty AND history exists, seed from PLANS constant
  useEffect(() => {
    const currentPlans = usePlanStore.getState().plans
    if (currentPlans.length === 0 && historyLength > 0) {
      usePlanStore.setState({ plans: Object.values(PLANS), nextLabel: 'D' })
    }
  }, [historyLength])

  // Auto-redirect to complete screen when status is 'completed'
  useEffect(() => {
    if (status === 'completed') {
      router.replace('/(workout)/complete')
    }
  }, [status, router])

  const nextPlanId = getNextPlanId(plans, lastDates)
  const isActive = status === 'active'

  const handleCardPress = (plan: Plan): void => {
    startWorkout(plan)
    router.push('/(workout)/exercise')
  }

  const handleResumeBannerPress = (): void => {
    router.push('/(workout)/exercise')
  }

  const handleHistoryPress = (): void => {
    router.push('/history')
  }

  const handleMyPlansPress = (): void => {
    router.push('/plans/')
  }

  // Empty state for new users with no plans and no history
  if (plans.length === 0 && historyLength === 0) {
    return (
      <View className="flex-1 bg-background">
        <View className="mt-14 px-6">
          <Text className="font-ui text-[12px] uppercase tracking-[6px] text-muted">FORJA</Text>
        </View>
        <EmptyPlans />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact header — brand as subtle wordmark */}
        <View className="mt-14 flex-row items-center justify-between px-6">
          <Text className="font-ui text-[12px] uppercase tracking-[6px] text-muted">FORJA</Text>
          {historyLength > 0 ? (
            <HistoryChip count={historyLength} onPress={handleHistoryPress} />
          ) : null}
        </View>

        {/* Hero greeting — the content is the star, not the brand */}
        <Text className="mt-8 px-6 font-display text-[42px] leading-none tracking-[1px] text-text">
          Vamos{'\n'}treinar.
        </Text>

        {/* Section label */}
        <Text className="mt-10 px-6 font-ui text-[11px] uppercase tracking-[3px] text-accent">
          SEUS TREINOS
        </Text>

        {/* Workout cards */}
        <View className="mt-4 gap-3 px-6">
          {plans.map((plan) => (
            <WorkoutCard
              key={plan.id}
              planId={plan.id}
              planName={`${plan.label} ${plan.name}`}
              focus={plan.focus}
              lastDate={lastDates[plan.id]}
              isNext={plan.id === nextPlanId}
              disabled={isActive}
              onPress={() => handleCardPress(plan)}
            />
          ))}
        </View>

        {/* "Meus Treinos" button — hidden during active workout */}
        {!isActive ? (
          <View className="mt-6 px-6">
            <Pressable
              onPress={handleMyPlansPress}
              accessibilityRole="button"
              accessibilityLabel="Meus Treinos"
              className="h-[46px] items-center justify-center rounded-pill border border-border-med"
            >
              <Text className="font-ui text-[13px] uppercase tracking-[2px] text-text-med">
                MEUS TREINOS
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky bottom CTA — thumb zone, always reachable */}
      {isActive ? (
        <View className="border-t border-border bg-background px-6 pb-10 pt-4">
          <Pressable
            testID="resume-banner"
            onPress={handleResumeBannerPress}
            accessibilityRole="button"
            accessibilityLabel="Continuar Treino"
            className="h-[56px] items-center justify-center rounded-pill bg-accent"
          >
            <Text className="font-ui text-[14px] uppercase tracking-[1px] text-background">
              CONTINUAR TREINO
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}
