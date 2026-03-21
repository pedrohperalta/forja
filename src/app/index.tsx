import { useEffect } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'

import { useWorkoutStore } from '@/stores/workoutStore'
import { useAppStore } from '@/stores/appStore'
import { PLANS } from '@/constants/plans'
import { getNextPlanId } from '@/utils/getNextPlanId'
import { WorkoutCard } from '@/components/WorkoutCard'
import { HistoryChip } from '@/components/HistoryChip'
import type { Plan } from '@/types'

const PLAN_ENTRIES = Object.values(PLANS) as Plan[]

export default function HomeScreen() {
  const router = useRouter()

  // Atomic selectors (Zustand v5)
  const status = useWorkoutStore((s) => s.status)
  const startWorkout = useWorkoutStore((s) => s.startWorkout)
  const lastDates = useAppStore((s) => s.lastDates)
  const historyLength = useAppStore((s) => s.history.length)

  // Auto-redirect to complete screen when status is 'completed'
  useEffect(() => {
    if (status === 'completed') {
      router.replace('/(workout)/complete')
    }
  }, [status, router])

  const nextPlanId = getNextPlanId(lastDates)
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
          {PLAN_ENTRIES.map((plan) => (
            <WorkoutCard
              key={plan.id}
              planId={plan.id}
              planName={plan.name}
              focus={plan.focus}
              lastDate={lastDates[plan.id]}
              isNext={plan.id === nextPlanId}
              disabled={isActive}
              onPress={() => handleCardPress(plan)}
            />
          ))}
        </View>
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
