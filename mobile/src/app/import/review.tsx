import { View, Text, Pressable, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Path } from 'react-native-svg'

import { useImportStore } from '@/stores/importStore'
import { useHaptics } from '@/hooks/useHaptics'
import { ExtractedExerciseRow } from '@/components/import/ExtractedExerciseRow'
import type { ExtractedExercise } from '@/types'

/** Review screen — displays extracted workouts for user review and edit before confirming import. */
export default function ImportReviewScreen(): React.JSX.Element {
  const workouts = useImportStore((s) => s.workouts)
  const mode = useImportStore((s) => s.mode)
  const confirmImport = useImportStore((s) => s.confirmImport)
  const reset = useImportStore((s) => s.reset)
  const updateExtractedExercise = useImportStore((s) => s.updateExtractedExercise)
  const removeExtractedExercise = useImportStore((s) => s.removeExtractedExercise)
  const router = useRouter()
  const haptics = useHaptics()

  const handleConfirm = (): void => {
    haptics.success()
    confirmImport()

    // Read skippedPlanId after confirmImport sets it
    const { skippedPlanId } = useImportStore.getState()

    if (skippedPlanId) {
      Alert.alert(
        'Plano não arquivado',
        'Um plano com treino ativo não foi arquivado. Finalize o treino ativo primeiro.',
      )
    }

    router.replace('/plans')
    reset()
  }

  const handleExerciseUpdate =
    (workoutIndex: number, exerciseIndex: number) =>
    (changes: Partial<ExtractedExercise>): void => {
      updateExtractedExercise(workoutIndex, exerciseIndex, changes)
    }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 pt-14">
        {/* Chevron bar — back to processing */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para processamento"
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
            PROCESSAMENTO
          </Text>
        </Pressable>

        {/* Title */}
        <Text className="font-display text-[36px] tracking-[1px] text-text">
          REVISAR IMPORTAÇÃO
        </Text>

        {/* Mode badge */}
        <View className="mt-2 flex-row">
          <View className="rounded-pill bg-accent-dim px-4 py-1.5">
            <Text className="font-ui text-[10px] uppercase tracking-[2px] text-accent">
              {mode === 'replace' ? 'SUBSTITUIR' : 'ADICIONAR'}
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {workouts.map((workout, wi) => (
          <View key={`workout-${wi}`} className="mb-6">
            {/* Workout header */}
            <View className="mb-3">
              <Text className="font-display text-[22px] tracking-[0.5px] text-text">
                {workout.name}
              </Text>
              <Text className="mt-0.5 font-ui text-[11px] text-muted">
                {workout.exercises.length} exercícios
              </Text>
            </View>

            {/* Exercise list */}
            <View className="gap-2">
              {workout.exercises.map((exercise, ei) => (
                <ExtractedExerciseRow
                  key={`exercise-${wi}-${exercise.name}-${ei}`}
                  name={exercise.name}
                  category={exercise.category}
                  sets={exercise.sets}
                  reps={exercise.reps}
                  equipment={exercise.equipment}
                  confidence={exercise.confidence}
                  editable
                  onUpdate={handleExerciseUpdate(wi, ei)}
                  onRemove={() => removeExtractedExercise(wi, ei)}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Bottom spacer for sticky CTA */}
        <View className="h-4" />
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View className="border-t border-border bg-background px-6 pb-10 pt-4">
        <Pressable
          accessibilityRole="button"
          onPress={handleConfirm}
          className="h-[56px] items-center justify-center rounded-pill bg-accent"
        >
          <Text className="font-ui text-[14px] font-semibold uppercase tracking-[2px] text-background">
            CONFIRMAR
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
