import { useState } from 'react'
import { View, Text } from 'react-native'
import { FlashList } from '@shopify/flash-list'

import { useAppStore } from '@/stores/appStore'
import { WorkoutHistoryCard } from '@/components/WorkoutHistoryCard'
import type { WorkoutId, WorkoutSession } from '@/types'

export default function HistoryScreen() {
  const history = useAppStore((s) => s.history)
  const deleteWorkout = useAppStore((s) => s.deleteWorkout)

  const [deletingId, setDeletingId] = useState<WorkoutId | null>(null)

  // Sort by date descending, then createdAt descending for same-date workouts
  const sorted = [...history].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date)
    if (dateCompare !== 0) return dateCompare
    return b.createdAt.localeCompare(a.createdAt)
  })

  const handleDelete = (id: WorkoutId): void => {
    setDeletingId(id)
  }

  const handleConfirmDelete = (id: WorkoutId): void => {
    deleteWorkout(id)
    setDeletingId(null)
  }

  const handleCancelDelete = (): void => {
    setDeletingId(null)
  }

  const renderItem = ({ item }: { item: WorkoutSession }): React.JSX.Element => (
    <View className="mb-3">
      <WorkoutHistoryCard
        id={item.id}
        planId={item.planId}
        planName={item.planName}
        focus={item.focus}
        date={item.date}
        durationMinutes={item.durationMinutes}
        exercises={item.exercises}
        isDeleting={deletingId === item.id}
        onDelete={() => handleDelete(item.id)}
        onConfirmDelete={() => handleConfirmDelete(item.id)}
        onCancelDelete={handleCancelDelete}
      />
    </View>
  )

  if (sorted.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="font-ui text-base text-muted">
          Nenhum treino registrado
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background px-4 pt-16">
      <Text className="mb-4 font-display text-3xl text-text">
        Historico
      </Text>
      <FlashList
        data={sorted}
        renderItem={renderItem}
        keyExtractor={(item: WorkoutSession) => item.id}
      />
    </View>
  )
}
