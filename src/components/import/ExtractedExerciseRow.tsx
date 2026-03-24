import { useState } from 'react'
import { View, Text, Pressable, TextInput } from 'react-native'

import { ConfidenceBadge } from '@/components/import/ConfidenceBadge'
import { MUSCLE_CATEGORIES } from '@/constants/categories'
import type { ExtractedExercise } from '@/types'

type ExtractedExerciseRowProps = {
  name: string
  category: string
  sets: number
  reps: string
  equipment: string
  confidence: number
  editable?: boolean
  onUpdate?: (changes: Partial<ExtractedExercise>) => void
}

/** Display row with optional inline edit mode for extracted exercises. */
export function ExtractedExerciseRow({
  name,
  category,
  sets,
  reps,
  equipment,
  confidence,
  editable = false,
  onUpdate,
}: ExtractedExerciseRowProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(name)
  const [editSets, setEditSets] = useState(String(sets))
  const [editReps, setEditReps] = useState(reps)
  const [editEquipment, setEditEquipment] = useState(equipment)

  const handleEdit = (): void => {
    setEditName(name)
    setEditSets(String(sets))
    setEditReps(reps)
    setEditEquipment(equipment)
    setEditing(true)
  }

  const handleClose = (): void => {
    setEditing(false)
  }

  const handleNameSubmit = (): void => {
    if (editName !== name) {
      onUpdate?.({ name: editName })
    }
  }

  const handleSetsSubmit = (): void => {
    const parsed = parseInt(editSets, 10)
    if (!isNaN(parsed) && parsed !== sets) {
      onUpdate?.({ sets: parsed })
    }
  }

  const handleRepsSubmit = (): void => {
    if (editReps !== reps) {
      onUpdate?.({ reps: editReps })
    }
  }

  const handleEquipmentSubmit = (): void => {
    if (editEquipment !== equipment) {
      onUpdate?.({ equipment: editEquipment })
    }
  }

  const handleCategorySelect = (cat: string): void => {
    if (cat !== category) {
      onUpdate?.({ category: cat })
    }
  }

  if (editing) {
    return (
      <View className="rounded-lg border border-border bg-surface px-4 py-3">
        {/* Name input */}
        <View className="mb-2">
          <Text className="mb-1 font-ui text-[10px] uppercase tracking-[1.5px] text-muted">
            NOME
          </Text>
          <TextInput
            className="rounded-lg border border-border-med bg-surface-2 px-3 py-2 font-ui text-[14px] text-text"
            value={editName}
            onChangeText={setEditName}
            onSubmitEditing={handleNameSubmit}
          />
        </View>

        {/* Category picker */}
        <View className="mb-2">
          <Text className="mb-1 font-ui text-[10px] uppercase tracking-[1.5px] text-muted">
            CATEGORIA
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {MUSCLE_CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => handleCategorySelect(cat)}
                className={`rounded-pill px-3 py-1 ${
                  cat === category ? 'bg-accent' : 'bg-surface-2'
                }`}
              >
                <Text
                  className={`font-ui text-[10px] ${
                    cat === category ? 'text-background' : 'text-text-med'
                  }`}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Sets + Reps row */}
        <View className="mb-2 flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-1 font-ui text-[10px] uppercase tracking-[1.5px] text-muted">
              SÉRIES
            </Text>
            <TextInput
              className="rounded-lg border border-border-med bg-surface-2 px-3 py-2 font-ui text-[14px] text-text"
              value={editSets}
              onChangeText={setEditSets}
              onSubmitEditing={handleSetsSubmit}
              keyboardType="number-pad"
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1 font-ui text-[10px] uppercase tracking-[1.5px] text-muted">
              REPS
            </Text>
            <TextInput
              className="rounded-lg border border-border-med bg-surface-2 px-3 py-2 font-ui text-[14px] text-text"
              value={editReps}
              onChangeText={setEditReps}
              onSubmitEditing={handleRepsSubmit}
            />
          </View>
        </View>

        {/* Equipment input */}
        <View className="mb-3">
          <Text className="mb-1 font-ui text-[10px] uppercase tracking-[1.5px] text-muted">
            EQUIPAMENTO
          </Text>
          <TextInput
            className="rounded-lg border border-border-med bg-surface-2 px-3 py-2 font-ui text-[14px] text-text"
            value={editEquipment}
            onChangeText={setEditEquipment}
            onSubmitEditing={handleEquipmentSubmit}
          />
        </View>

        {/* Close button */}
        <Pressable
          accessibilityRole="button"
          onPress={handleClose}
          className="items-center rounded-pill border border-border-med py-2"
        >
          <Text className="font-ui text-[11px] uppercase tracking-[1.5px] text-text-med">
            FECHAR
          </Text>
        </Pressable>
      </View>
    )
  }

  return (
    <Pressable
      accessibilityLabel={editable ? 'Editar exercício' : undefined}
      onPress={editable ? handleEdit : undefined}
      className="rounded-lg border border-border bg-surface px-4 py-3"
    >
      {/* Top: name + confidence */}
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="font-display text-[18px] tracking-[0.5px] text-text" numberOfLines={1}>
            {name}
          </Text>

          {/* Category + equipment badges */}
          <View className="mt-1.5 flex-row gap-2">
            <View className="rounded-pill bg-surface-2 px-3 py-1">
              <Text className="font-ui text-[10px] text-text-med">{category}</Text>
            </View>
            <View className="rounded-pill bg-surface-2 px-3 py-1">
              <Text className="font-ui text-[10px] text-text-med">{equipment}</Text>
            </View>
          </View>
        </View>

        <ConfidenceBadge confidence={confidence} />
      </View>

      {/* Bottom: sets x reps */}
      <View className="mt-2">
        <Text className="font-display text-[14px] tracking-[0.5px] text-accent">
          {sets} x {reps}
        </Text>
      </View>
    </Pressable>
  )
}
