import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useRouter, useFocusEffect } from 'expo-router'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useAppStore } from '@/stores/appStore'
import { useHaptics } from '@/hooks/useHaptics'
import { getCurrentExercise } from '@/utils/getCurrentExercise'
import { ProgressBar } from '@/components/ProgressBar'
import { WeightInput } from '@/components/WeightInput'
import { SeriesDots } from '@/components/SeriesDots'
import { EquipmentPhoto } from '@/components/EquipmentPhoto'
import type { NavigationTarget } from '@/types'

export default function ExerciseScreen(): React.JSX.Element | null {
  const router = useRouter()

  // Atomic selectors from workoutStore
  const status = useWorkoutStore((s) => s.status)
  const activePlan = useWorkoutStore((s) => s.activePlan)
  const queue = useWorkoutStore((s) => s.queue)
  const skippedIds = useWorkoutStore((s) => s.skippedIds)
  const currentSet = useWorkoutStore((s) => s.currentSet)
  const currentSets = useWorkoutStore((s) => s.currentSets)
  const log = useWorkoutStore((s) => s.log)
  const completeSet = useWorkoutStore((s) => s.completeSet)
  const skipExercise = useWorkoutStore((s) => s.skipExercise)
  const removeExercise = useWorkoutStore((s) => s.removeExercise)

  // Atomic selector from appStore
  const lastWeights = useAppStore((s) => s.lastWeights)

  // Haptic feedback
  const haptics = useHaptics()

  // Derive current exercise — NEVER queue[0]
  const currentExercise = getCurrentExercise(queue, skippedIds)

  // Weight input state
  const [weight, setWeight] = useState('')
  const isNavigating = useRef(false)

  // Reset navigation guard when screen regains focus (e.g. returning from rest)
  useFocusEffect(
    useCallback(() => {
      isNavigating.current = false
    }, []),
  )

  // Pre-fill weight on exercise change
  useEffect(() => {
    if (!currentExercise) return

    isNavigating.current = false

    if (currentSets.length > 0) {
      // Between sets — use last completed set's weight
      const lastSetWeight = currentSets[currentSets.length - 1]?.weight
      setWeight(lastSetWeight != null && lastSetWeight > 0 ? String(lastSetWeight) : '')
    } else {
      // New exercise — use lastWeights from appStore
      const savedWeight = lastWeights[currentExercise.id]
      setWeight(savedWeight != null && savedWeight > 0 ? String(savedWeight) : '')
    }
  }, [currentExercise?.id, currentSets.length, lastWeights])

  // Guards — redirect based on state
  useEffect(() => {
    if (status === 'completed') {
      router.replace('/(workout)/complete')
      return
    }

    if (!currentExercise) {
      if (queue.length > 0) {
        // Exercises still in queue (all skipped) — checkpoint first
        router.replace('/(workout)/checkpoint')
      } else if (log.length > 0) {
        // Queue empty, exercises were completed — done
        router.replace('/(workout)/complete')
      } else {
        // Truly empty — no queue, no log
        router.replace('/')
      }
    }
  }, [status, currentExercise, log.length, queue.length, router])

  // Handle navigation based on NavigationTarget
  const handleNavigation = (result: NavigationTarget): void => {
    switch (result.target) {
      case 'rest':
        router.push({
          pathname: '/(workout)/rest',
          params: { restSeconds: String(result.restSeconds) },
        })
        break
      case 'checkpoint':
        router.push('/(workout)/checkpoint')
        break
      case 'complete':
        router.replace('/(workout)/complete')
        break
      case 'next':
        // Re-render shows new exercise — no navigation needed
        break
    }
  }

  const handleCompleteSet = (): void => {
    if (isNavigating.current) return
    isNavigating.current = true

    const weightNum = parseFloat(weight)
    if (isNaN(weightNum) || weightNum < 0) {
      isNavigating.current = false
      return
    }

    haptics.medium()
    const result = completeSet(weightNum)
    handleNavigation(result)
  }

  const handleSkip = (): void => {
    const result = skipExercise()
    handleNavigation(result)
  }

  const handleRemove = (): void => {
    const result = removeExercise()
    handleNavigation(result)
  }

  // Guard rendering — show nothing while redirecting
  if (!currentExercise || !activePlan) return null

  const totalExercises = activePlan.exercises.length
  const isWeightValid = weight !== '' && !isNaN(parseFloat(weight)) && parseFloat(weight) >= 0

  return (
    <View className="flex-1 bg-background">
      {/* Scrollable content area */}
      <ScrollView
        className="flex-1 px-6 pt-14"
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back navigation — chevron integrated with section label */}
        <View className="mb-2 flex-row items-center">
          <Pressable
            testID="back-button"
            onPress={() => router.replace('/')}
            accessibilityRole="button"
            accessibilityLabel="Voltar ao início"
            className="mr-1 h-[44px] w-[44px] items-center justify-center"
          >
            <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
              <Path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="#888888"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
          <Text className="font-ui text-[10px] uppercase tracking-[3px] text-accent">INÍCIO</Text>
        </View>

        {/* Progress bar */}
        <ProgressBar current={log.length} total={totalExercises} />

        {/* Progress counter */}
        <Text className="mt-2 text-center font-ui text-[11px] tracking-[2px] text-muted">
          {log.length + 1} de {totalExercises}
        </Text>

        {/* Exercise name — the HERO */}
        <Text className="mt-1 text-center font-display text-[36px] tracking-[1px] text-text">
          {currentExercise.name}
        </Text>

        {/* Exercise badges */}
        <View className="mt-2 flex-row items-center justify-center gap-2">
          <View className="rounded-pill bg-surface-2 px-3 py-1">
            <Text className="font-ui text-[10px] uppercase tracking-[1px] text-text-med">
              {currentExercise.category}
            </Text>
          </View>
          <View className="rounded-pill bg-surface-2 px-3 py-1">
            <Text className="font-ui text-[10px] uppercase tracking-[1px] text-text-med">
              {currentExercise.equipment}
            </Text>
          </View>
        </View>

        {/* Equipment photo reference */}
        <View className="mt-3 px-2">
          <EquipmentPhoto exerciseId={currentExercise.id} />
        </View>

        {/* Reps info */}
        <Text className="mt-3 text-center font-ui text-[15px] text-text-med">
          {currentExercise.reps} reps
        </Text>

        {/* Series dots */}
        <View className="mt-3 items-center">
          <SeriesDots currentSet={currentSet} totalSets={currentExercise.sets} />
        </View>

        {/* Weight input — key forces remount on exercise change */}
        <View className="mt-5">
          <Text className="mb-2 text-center font-ui text-[11px] uppercase tracking-[3px] text-muted">
            PESO (KG)
          </Text>
          <WeightInput
            key={currentExercise.id}
            value={weight}
            onChange={setWeight}
            exerciseName={currentExercise.name}
            setNumber={currentSet}
          />
        </View>
      </ScrollView>

      {/* Sticky bottom actions — thumb zone */}
      <View className="border-t border-border bg-background px-6 pb-8 pt-4">
        <Pressable
          testID="complete-set-button"
          className={`h-[56px] items-center justify-center rounded-pill ${
            isWeightValid ? 'bg-accent' : 'bg-surface-2'
          }`}
          onPress={handleCompleteSet}
          disabled={!isWeightValid}
          accessibilityRole="button"
          accessibilityLabel="Completei a série"
          accessibilityState={{ disabled: !isWeightValid }}
        >
          <Text
            className={`font-ui text-[14px] uppercase tracking-[1px] ${isWeightValid ? 'text-background' : 'text-dim'}`}
          >
            COMPLETEI A SÉRIE
          </Text>
        </Pressable>

        {/* Skip/Remove buttons — only on set 1 */}
        {currentSet === 1 && (
          <View className="mt-3 flex-row gap-3">
            <Pressable
              testID="skip-button"
              className="h-[46px] flex-1 items-center justify-center rounded-pill border border-border-med"
              onPress={handleSkip}
              accessibilityRole="button"
              accessibilityLabel="Pular exercício"
            >
              <Text className="font-ui text-[13px] text-text-med">Pular</Text>
            </Pressable>
            <Pressable
              testID="not-doing-button"
              className="h-[46px] flex-1 items-center justify-center rounded-pill border border-danger-dim"
              onPress={handleRemove}
              accessibilityRole="button"
              accessibilityLabel="Não vou fazer este exercício"
            >
              <Text className="font-ui text-[13px] text-danger">Não vou fazer</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  )
}
