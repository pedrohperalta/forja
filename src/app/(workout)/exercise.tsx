import { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useAppStore } from '@/stores/appStore'
import { getCurrentExercise } from '@/utils/getCurrentExercise'
import { ProgressBar } from '@/components/ProgressBar'
import { WeightInput } from '@/components/WeightInput'
import { SeriesDots } from '@/components/SeriesDots'
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

  // Derive current exercise — NEVER queue[0]
  const currentExercise = getCurrentExercise(queue, skippedIds)

  // Weight input state
  const [weight, setWeight] = useState('')
  const isNavigating = useRef(false)

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
      if (log.length > 0) {
        router.replace('/(workout)/complete')
      } else if (queue.length > 0) {
        // All exercises are skipped, nothing logged
        router.replace('/(workout)/checkpoint')
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
        router.push('/(workout)/rest')
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
    <View className="flex-1 bg-background px-6 pt-16">
      {/* Progress bar */}
      <ProgressBar current={log.length} total={totalExercises} />

      {/* Exercise name */}
      <Text className="mt-6 text-center text-3xl font-bold text-text">{currentExercise.name}</Text>

      {/* Reps info */}
      <Text className="mt-2 text-center text-lg text-text-med">{currentExercise.reps} reps</Text>

      {/* Series dots */}
      <View className="mt-4 items-center">
        <SeriesDots currentSet={currentSet} totalSets={currentExercise.sets} />
      </View>

      {/* Weight input — key forces remount on exercise change */}
      <View className="mt-8">
        <Text className="mb-2 text-center text-sm text-text-med">Peso (kg)</Text>
        <WeightInput
          key={currentExercise.id}
          value={weight}
          onChange={setWeight}
          exerciseName={currentExercise.name}
          setNumber={currentSet}
        />
      </View>

      {/* Complete set button */}
      <Pressable
        className={`mt-8 h-14 items-center justify-center rounded-md ${
          isWeightValid && !isNavigating.current ? 'bg-accent' : 'bg-dim'
        }`}
        onPress={handleCompleteSet}
        disabled={!isWeightValid}
        accessibilityRole="button"
        accessibilityState={{ disabled: !isWeightValid }}
      >
        <Text className="text-lg font-bold text-background">COMPLETEI A SÉRIE</Text>
      </Pressable>

      {/* Skip/Remove buttons — only on set 1 */}
      {currentSet === 1 && (
        <View className="mt-4 flex-row justify-center gap-4">
          <Pressable
            className="rounded-md border border-border-med px-6 py-3"
            onPress={handleSkip}
            accessibilityRole="button"
          >
            <Text className="text-text-med">Pular</Text>
          </Pressable>
          <Pressable
            className="rounded-md border border-danger-dim px-6 py-3"
            onPress={handleRemove}
            accessibilityRole="button"
          >
            <Text className="text-danger">Não vou fazer</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}
