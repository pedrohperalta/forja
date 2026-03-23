import { useState } from 'react'
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import Svg, { Path } from 'react-native-svg'

import { usePlanStore } from '@/stores/planStore'
import { CategorySelector } from '@/components/CategorySelector'
import { ExerciseFormSchema } from '@/schemas/plan'
import type { PlanId, ExerciseId } from '@/types'

const DEFAULT_SETS = 3
const DEFAULT_REST_SECONDS = 60
const DEFAULT_REPS = '10-12'

/** Exercise form screen — create or edit an exercise in a plan. */
export default function ExerciseFormScreen(): React.JSX.Element {
  const { id, exerciseId } = useLocalSearchParams<{ id: string; exerciseId?: string }>()
  const plans = usePlanStore((s) => s.plans)
  const addExercise = usePlanStore((s) => s.addExercise)
  const updateExercise = usePlanStore((s) => s.updateExercise)
  const router = useRouter()

  const plan = plans.find((p) => p.id === id)
  const existingExercise = exerciseId ? plan?.exercises.find((e) => e.id === exerciseId) : undefined

  const isEditMode = existingExercise !== undefined

  // Form state
  const [name, setName] = useState(existingExercise?.name ?? '')
  const [category, setCategory] = useState(existingExercise?.category ?? '')
  const [equipment, setEquipment] = useState(existingExercise?.equipment ?? '')
  const [reps, setReps] = useState(existingExercise?.reps ?? DEFAULT_REPS)
  const [sets, setSets] = useState(existingExercise?.sets ?? DEFAULT_SETS)
  const [restSeconds, setRestSeconds] = useState(
    existingExercise?.restSeconds ?? DEFAULT_REST_SECONDS,
  )

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSave = (): void => {
    const formData = {
      name: name.trim(),
      category,
      equipment: equipment.trim(),
      reps,
      sets,
      restSeconds,
    }
    const result = ExerciseFormSchema.safeParse(formData)

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0]
        if (field !== undefined && typeof field === 'string') {
          fieldErrors[field] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    if (isEditMode && exerciseId) {
      updateExercise(id as PlanId, exerciseId as ExerciseId, {
        name: formData.name,
        category: formData.category,
        equipment: formData.equipment,
        reps: formData.reps,
        sets: formData.sets,
        restSeconds: formData.restSeconds,
      })
    } else {
      addExercise(id as PlanId, {
        name: formData.name,
        category: formData.category,
        equipment: formData.equipment,
        reps: formData.reps,
        sets: formData.sets,
        restSeconds: formData.restSeconds,
      })
    }

    router.back()
  }

  const incrementSets = (): void => setSets((prev) => prev + 1)
  const decrementSets = (): void => setSets((prev) => Math.max(1, prev - 1))
  const incrementRest = (): void => setRestSeconds((prev) => prev + 15)
  const decrementRest = (): void => setRestSeconds((prev) => Math.max(0, prev - 15))

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 pt-14">
        {/* Chevron bar — back to plan detail */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para exercicios"
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
            EXERCICIOS
          </Text>
        </Pressable>

        {/* Title */}
        <Text className="font-display text-[36px] tracking-[1px] text-text">
          {isEditMode ? 'EDITAR EXERCICIO' : 'NOVO EXERCICIO'}
        </Text>
      </View>

      {/* Form */}
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {/* Name field */}
        <View className="mb-5">
          <Text className="mb-2 font-ui text-[10px] uppercase tracking-[2px] text-muted">NOME</Text>
          <TextInput
            className="h-[48px] rounded-lg border border-border bg-surface px-4 font-ui text-[14px] text-text"
            value={name}
            onChangeText={setName}
            placeholder="Nome do exercicio"
            placeholderTextColor="#555"
            accessibilityLabel="Nome do exercicio"
          />
          {errors['name'] ? (
            <Text className="mt-1 font-ui text-[11px] text-danger">{errors['name']}</Text>
          ) : null}
        </View>

        {/* Category selector */}
        <View className="mb-5">
          <CategorySelector selected={category} onSelect={setCategory} />
          {errors['category'] ? (
            <Text className="mt-1 font-ui text-[11px] text-danger">{errors['category']}</Text>
          ) : null}
        </View>

        {/* Equipment field */}
        <View className="mb-5">
          <Text className="mb-2 font-ui text-[10px] uppercase tracking-[2px] text-muted">
            EQUIPAMENTO
          </Text>
          <TextInput
            className="h-[48px] rounded-lg border border-border bg-surface px-4 font-ui text-[14px] text-text"
            value={equipment}
            onChangeText={setEquipment}
            placeholder="Equipamento"
            placeholderTextColor="#555"
            accessibilityLabel="Equipamento"
          />
        </View>

        {/* Reps field */}
        <View className="mb-5">
          <Text className="mb-2 font-ui text-[10px] uppercase tracking-[2px] text-muted">
            REPETICOES
          </Text>
          <TextInput
            className="h-[48px] rounded-lg border border-border bg-surface px-4 font-ui text-[14px] text-text"
            value={reps}
            onChangeText={setReps}
            placeholder="Ex: 10-12"
            placeholderTextColor="#555"
            accessibilityLabel="Repeticoes"
          />
        </View>

        {/* Sets stepper */}
        <View className="mb-5">
          <Text className="mb-2 font-ui text-[10px] uppercase tracking-[2px] text-muted">
            SERIES
          </Text>
          <View className="flex-row items-center gap-4">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Diminuir series"
              onPress={decrementSets}
              className="h-[44px] w-[44px] items-center justify-center rounded-pill border border-border bg-surface"
            >
              <Text className="font-display text-[20px] text-text">-</Text>
            </Pressable>
            <Text className="font-display text-[28px] text-accent">{sets}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Aumentar series"
              onPress={incrementSets}
              className="h-[44px] w-[44px] items-center justify-center rounded-pill border border-border bg-surface"
            >
              <Text className="font-display text-[20px] text-text">+</Text>
            </Pressable>
          </View>
        </View>

        {/* Rest stepper */}
        <View className="mb-8">
          <Text className="mb-2 font-ui text-[10px] uppercase tracking-[2px] text-muted">
            DESCANSO (SEGUNDOS)
          </Text>
          <View className="flex-row items-center gap-4">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Diminuir descanso"
              onPress={decrementRest}
              className="h-[44px] w-[44px] items-center justify-center rounded-pill border border-border bg-surface"
            >
              <Text className="font-display text-[20px] text-text">-</Text>
            </Pressable>
            <Text className="font-display text-[28px] text-accent">{restSeconds}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Aumentar descanso"
              onPress={incrementRest}
              className="h-[44px] w-[44px] items-center justify-center rounded-pill border border-border bg-surface"
            >
              <Text className="font-display text-[20px] text-text">+</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View className="border-t border-border bg-background px-6 pb-10 pt-4">
        <Pressable
          accessibilityRole="button"
          onPress={handleSave}
          className="h-[56px] items-center justify-center rounded-pill bg-accent"
        >
          <Text className="font-ui text-[14px] font-semibold uppercase tracking-[2px] text-background">
            SALVAR
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
