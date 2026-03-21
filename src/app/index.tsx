import { useEffect } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'

import { useWorkoutStore } from '@/stores/workoutStore'
import { useAppStore } from '@/stores/appStore'
import { PLANS } from '@/constants/plans'
import { getNextPlanId } from '@/utils/getNextPlanId'
import { WorkoutCard } from '@/components/WorkoutCard'
import { HistoryChip } from '@/components/HistoryChip'
import type { Plan, PlanId } from '@/types'

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
    <ScrollView className="flex-1 bg-background px-4 pt-16">
      {/* Header */}
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="font-display text-4xl text-accent">FORJA</Text>
        {historyLength > 0 ? (
          <HistoryChip count={historyLength} onPress={handleHistoryPress} />
        ) : null}
      </View>

      {/* Resume banner */}
      {isActive ? (
        <Pressable
          onPress={handleResumeBannerPress}
          accessibilityRole="button"
          className="mb-4 rounded-lg bg-accent p-4"
        >
          <Text className="font-ui text-center text-base font-bold text-background">
            Continuar Treino
          </Text>
        </Pressable>
      ) : null}

      {/* Workout cards */}
      <View className="gap-3">
        {PLAN_ENTRIES.map((plan) => (
          <WorkoutCard
            key={plan.id}
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
  )
}
