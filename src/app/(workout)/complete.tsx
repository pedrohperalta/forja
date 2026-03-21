import { useEffect, useRef } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useAppStore } from '@/stores/appStore'
import { useHaptics } from '@/hooks/useHaptics'
import { buildWorkoutSession } from '@/utils/buildWorkoutSession'
import type { CompletedExercise, ExerciseLog } from '@/types'

export default function CompleteScreen(): React.JSX.Element {
  const router = useRouter()

  // Atomic selectors from workoutStore
  const status = useWorkoutStore((s) => s.status)
  const activePlan = useWorkoutStore((s) => s.activePlan)
  const log = useWorkoutStore((s) => s.log)
  const startedAt = useWorkoutStore((s) => s.startedAt)
  const completedAt = useWorkoutStore((s) => s.completedAt)
  const complete = useWorkoutStore((s) => s.complete)
  const reset = useWorkoutStore((s) => s.reset)

  // Atomic selectors from appStore
  const saveWorkout = useAppStore((s) => s.saveWorkout)
  const updateLastWeights = useAppStore((s) => s.updateLastWeights)

  // Haptic feedback on mount
  const haptics = useHaptics()
  const hasPlayedHaptic = useRef(false)

  useEffect(() => {
    if (!hasPlayedHaptic.current && log.length > 0) {
      hasPlayedHaptic.current = true
      haptics.success()
    }
  }, [haptics, log.length])

  // Prevent double save
  const hasSaved = useRef(false)

  // Status-based save logic on mount
  useEffect(() => {
    if (hasSaved.current) return
    if (!activePlan || !startedAt) return
    if (log.length === 0) return

    hasSaved.current = true

    // If status is 'active', call complete() first
    if (status === 'active') {
      complete()
    }

    // Build session — use completedAt if available, otherwise Date.now()
    const effectiveCompletedAt = completedAt ?? Date.now()
    const session = buildWorkoutSession(activePlan, log, startedAt, effectiveCompletedAt)

    // Save workout (idempotent — checks ID)
    saveWorkout(session)

    // Extract last set weight per exercise for lastWeights
    const weights: Record<string, number> = {}
    for (const entry of log) {
      const lastSet = entry.sets[entry.sets.length - 1]
      if (lastSet) {
        weights[entry.exerciseId] = lastSet.weight
      }
    }
    updateLastWeights(weights)
  }, [status, activePlan, log, startedAt, completedAt, complete, saveWorkout, updateLastWeights])

  const handleGoHome = (): void => {
    reset()
    router.replace('/')
  }

  // Compute display data
  const exerciseCount = log.length
  const totalSets = log.reduce((sum, entry) => sum + entry.sets.length, 0)
  const durationMinutes =
    startedAt && completedAt ? Math.round((completedAt - startedAt) / 60000) : 0

  // Build exercise summary
  const exercises: CompletedExercise[] = log.map((entry: ExerciseLog) => {
    const lastSet = entry.sets[entry.sets.length - 1]
    return {
      name: entry.name,
      sets: entry.sets.length,
      weight: lastSet?.weight ?? 0,
    }
  })

  // Empty log state
  if (log.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-xl text-text-med">Nenhum exercício completado</Text>
        <Pressable
          testID="back-to-home-button"
          className="mt-8 rounded-md bg-accent px-8 py-4"
          onPress={handleGoHome}
          accessibilityRole="button"
          accessibilityLabel="Voltar ao início"
        >
          <Text className="font-bold text-background">VOLTAR AO INÍCIO</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      {/* Title */}
      <Text className="text-center text-3xl font-bold text-accent">Treino Completo!</Text>

      {/* Stats grid — 3 columns */}
      <View className="mt-8 flex-row justify-around">
        <View className="items-center">
          <Text className="text-3xl font-bold text-text">{exerciseCount}</Text>
          <Text className="text-sm text-text-med">Exercícios</Text>
        </View>
        <View className="items-center">
          <Text className="text-3xl font-bold text-text">{totalSets}</Text>
          <Text className="text-sm text-text-med">Séries</Text>
        </View>
        <View className="items-center">
          <Text className="text-3xl font-bold text-text">{durationMinutes}</Text>
          <Text className="text-sm text-text-med">Minutos</Text>
        </View>
      </View>

      {/* Exercise summary list */}
      <View className="mt-8 flex-1">
        <Text className="mb-4 text-lg font-bold text-text">Resumo</Text>
        <FlashList
          data={exercises}
          renderItem={({ item }: { item: CompletedExercise }) => (
            <View className="mb-2 flex-row items-center justify-between rounded-md bg-surface p-3">
              <View>
                <Text className="text-text">{item.name}</Text>
                <Text className="text-xs text-text-med">{item.sets} séries</Text>
              </View>
              <Text className="text-lg font-bold text-accent">{item.weight} kg</Text>
            </View>
          )}
          keyExtractor={(item: CompletedExercise, index: number) => `${item.name}-${index}`}
        />
      </View>

      {/* Go home button */}
      <Pressable
        testID="back-to-home-button"
        className="mb-12 rounded-md bg-accent py-4"
        onPress={handleGoHome}
        accessibilityRole="button"
        accessibilityLabel="Voltar ao início"
      >
        <Text className="text-center font-bold text-background">VOLTAR AO INÍCIO</Text>
      </Pressable>
    </View>
  )
}
