import { useRef } from 'react'
import { View, Text, Pressable, ScrollView, TextInput, LayoutAnimation } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import Svg, { Path } from 'react-native-svg'

import { usePlanStore } from '@/stores/planStore'
import { useHaptics } from '@/hooks/useHaptics'
import { ExerciseRow } from '@/components/ExerciseRow'
import type { PlanId, ExerciseId } from '@/types'

/** Plan detail screen — shows exercises with edit, delete, and reorder. */
export default function PlanDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>()
  const plans = usePlanStore((s) => s.plans)
  const updatePlan = usePlanStore((s) => s.updatePlan)
  const removeExercise = usePlanStore((s) => s.removeExercise)
  const reorderExercises = usePlanStore((s) => s.reorderExercises)
  const router = useRouter()
  const haptics = useHaptics()
  const nameInputRef = useRef<TextInput>(null)

  const plan = plans.find((p) => p.id === id)

  if (!plan) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="font-ui text-[14px] text-muted">Plano nao encontrado</Text>
      </View>
    )
  }

  const isNewPlan = plan.name === '' && plan.exercises.length === 0

  const handleAddExercise = (): void => {
    router.push({ pathname: '/plans/[id]/exercise', params: { id: plan.id } })
  }

  const handleEditExercise = (exerciseId: ExerciseId): void => {
    router.push({ pathname: '/plans/[id]/exercise', params: { id: plan.id, exerciseId } })
  }

  const handleDeleteExercise = (exerciseId: ExerciseId): void => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    haptics.warning()
    removeExercise(plan.id as PlanId, exerciseId)
  }

  const handleNameChange = (name: string): void => {
    updatePlan(plan.id as PlanId, { name })
  }

  const handleFocusChange = (focus: string): void => {
    updatePlan(plan.id as PlanId, { focus })
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 pt-14">
        {/* Chevron bar — back to plans */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para planos"
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
            PLANOS
          </Text>
        </Pressable>

        {/* Plan label badge + editable name */}
        <View className="flex-row items-center gap-3">
          <View className="h-[40px] w-[40px] items-center justify-center rounded-pill bg-accent-dim">
            <Text className="font-display text-[20px] text-accent">{plan.label}</Text>
          </View>
          <View className="flex-1">
            <TextInput
              ref={nameInputRef}
              className="font-display text-[32px] tracking-[1px] text-text"
              value={plan.name}
              onChangeText={handleNameChange}
              placeholder="Nome do plano"
              placeholderTextColor="#555"
              accessibilityLabel="Nome do plano"
              autoFocus={isNewPlan}
            />
            <TextInput
              className="-mt-1 font-ui text-[13px] text-muted"
              value={plan.focus}
              onChangeText={handleFocusChange}
              placeholder="Foco (ex: Peito / Ombros)"
              placeholderTextColor="#444"
              accessibilityLabel="Foco do plano"
            />
          </View>
        </View>
      </View>

      {/* Exercise list */}
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {plan.exercises.length === 0 ? (
          <View className="items-center py-16">
            <Text className="font-ui text-[14px] text-muted">Nenhum exercicio adicionado</Text>
          </View>
        ) : (
          <View className="gap-3 pb-6">
            {plan.exercises.map((exercise) => (
              <ExerciseRow
                key={exercise.id}
                id={exercise.id}
                name={exercise.name}
                category={exercise.category}
                equipment={exercise.equipment}
                sets={exercise.sets}
                reps={exercise.reps}
                restSeconds={exercise.restSeconds}
                onEdit={() => handleEditExercise(exercise.id)}
                onDelete={() => handleDeleteExercise(exercise.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View className="border-t border-border bg-background px-6 pb-10 pt-4">
        <Pressable
          accessibilityRole="button"
          onPress={handleAddExercise}
          className="h-[56px] items-center justify-center rounded-pill bg-accent"
        >
          <Text className="font-ui text-[14px] font-semibold uppercase tracking-[2px] text-background">
            ADICIONAR EXERCICIO
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
