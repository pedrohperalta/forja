import { useEffect, useRef } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useAppStore } from '@/stores/appStore'
import { useHaptics } from '@/hooks/useHaptics'
import { buildWorkoutSession } from '@/utils/buildWorkoutSession'
import { sync } from '@/services/syncService'
import { useAuthStore } from '@/stores/authStore'
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

    // Push new session to server if authenticated
    if (useAuthStore.getState().user) {
      sync().catch(() => {})
    }
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
        <Text className="font-display text-[22px] tracking-[1px] text-text-med">
          Nenhum exercício completado
        </Text>
        <Pressable
          testID="back-to-home-button"
          className="mt-10 h-[52px] w-full items-center justify-center rounded-pill bg-accent"
          onPress={handleGoHome}
          accessibilityRole="button"
          accessibilityLabel="Voltar ao início"
        >
          <Text className="font-ui text-[13px] uppercase tracking-[1px] text-background">
            VOLTAR AO INÍCIO
          </Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      {/* Content area */}
      <View className="flex-1 px-6 pt-16">
        {/* Eyebrow chip */}
        <View className="items-center">
          <View className="rounded-pill bg-accent-dim px-4 py-1.5">
            <Text className="font-ui text-[10px] uppercase tracking-[2px] text-accent">
              TREINO CONCLUÍDO
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text className="mt-4 text-center font-display text-[40px] tracking-[2px] text-text">
          MUITO BEM!
        </Text>

        {/* Stats grid — 3 columns in cards */}
        <View className="mt-8 flex-row gap-3">
          <View className="flex-1 items-center rounded-lg bg-surface py-5">
            <Text className="font-display text-[40px] leading-none text-accent">
              {exerciseCount}
            </Text>
            <Text className="mt-2 font-ui text-[10px] uppercase tracking-[2px] text-muted">
              Exercicios
            </Text>
          </View>
          <View className="flex-1 items-center rounded-lg bg-surface py-5">
            <Text className="font-display text-[40px] leading-none text-accent">{totalSets}</Text>
            <Text className="mt-2 font-ui text-[10px] uppercase tracking-[2px] text-muted">
              Series
            </Text>
          </View>
          <View className="flex-1 items-center rounded-lg bg-surface py-5">
            <Text className="font-display text-[40px] leading-none text-accent">
              {durationMinutes}
            </Text>
            <Text className="mt-2 font-ui text-[10px] uppercase tracking-[2px] text-muted">
              Minutos
            </Text>
          </View>
        </View>

        {/* Exercise summary list */}
        <View className="mt-10 flex-1">
          <Text className="mb-4 font-ui text-[11px] uppercase tracking-[3px] text-accent">
            RESUMO
          </Text>
          <FlashList
            data={exercises}
            renderItem={({ item }: { item: CompletedExercise }) => (
              <View className="mb-3 flex-row items-center justify-between rounded-lg border border-border bg-surface px-5 py-4">
                <View className="flex-1">
                  <Text className="font-ui text-[15px] text-text">{item.name}</Text>
                  <Text className="mt-1 font-ui text-[11px] tracking-[0.5px] text-muted">
                    {item.sets} series
                  </Text>
                </View>
                <Text className="font-display text-[28px] text-accent">{item.weight} kg</Text>
              </View>
            )}
            keyExtractor={(item: CompletedExercise, index: number) => `${item.name}-${index}`}
          />
        </View>
      </View>

      {/* Sticky bottom CTA — thumb zone */}
      <View className="border-t border-border bg-background px-6 pb-10 pt-4">
        <Pressable
          testID="back-to-home-button"
          className="h-[56px] items-center justify-center rounded-pill bg-accent"
          onPress={handleGoHome}
          accessibilityRole="button"
          accessibilityLabel="Voltar ao início"
        >
          <Text className="font-ui text-[14px] uppercase tracking-[1px] text-background">
            VOLTAR AO INÍCIO
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
