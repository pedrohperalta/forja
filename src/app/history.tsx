import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import Svg, { Path } from 'react-native-svg'

import { useAppStore } from '@/stores/appStore'
import { WorkoutHistoryCard } from '@/components/WorkoutHistoryCard'
import type { WorkoutId, WorkoutSession } from '@/types'

/** Groups history entries by month for section labels. */
function getMonthLabel(dateStr: string): string {
  const months: Record<string, string> = {
    '01': 'Janeiro',
    '02': 'Fevereiro',
    '03': 'Março',
    '04': 'Abril',
    '05': 'Maio',
    '06': 'Junho',
    '07': 'Julho',
    '08': 'Agosto',
    '09': 'Setembro',
    '10': 'Outubro',
    '11': 'Novembro',
    '12': 'Dezembro',
  }
  // dateStr format: YYYY-MM-DD
  const parts = dateStr.split('-')
  const monthKey = parts[1] ?? ''
  const month = months[monthKey] ?? monthKey
  return `${month} ${parts[0] ?? ''}`
}

type HistoryListItem =
  | { type: 'header'; key: string; label: string }
  | { type: 'workout'; key: string; session: WorkoutSession }

/** Builds a flat list with month section headers interleaved. */
function buildSectionedList(sessions: WorkoutSession[]): HistoryListItem[] {
  const items: HistoryListItem[] = []
  let currentMonth = ''

  for (const session of sessions) {
    const monthLabel = getMonthLabel(session.date)
    if (monthLabel !== currentMonth) {
      currentMonth = monthLabel
      items.push({ type: 'header', key: `header-${monthLabel}`, label: monthLabel })
    }
    items.push({ type: 'workout', key: session.id, session })
  }

  return items
}

export default function HistoryScreen() {
  const router = useRouter()
  const history = useAppStore((s) => s.history)
  const deleteWorkout = useAppStore((s) => s.deleteWorkout)

  // Sort by date descending, then createdAt descending for same-date workouts
  const sorted = [...history].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date)
    if (dateCompare !== 0) return dateCompare
    return b.createdAt.localeCompare(a.createdAt)
  })

  const sectionedData = buildSectionedList(sorted)

  const handleDelete = (id: WorkoutId): void => {
    deleteWorkout(id)
  }

  const renderItem = ({ item }: { item: HistoryListItem }): React.JSX.Element => {
    if (item.type === 'header') {
      return (
        <View className="mb-2 mt-4">
          <Text className="font-ui text-[11px] uppercase tracking-[2px] text-dim">
            {item.label}
          </Text>
        </View>
      )
    }

    const { session } = item
    return (
      <View className="mb-2">
        <WorkoutHistoryCard
          id={session.id}
          planId={session.planId}
          planName={session.planName}
          {...(session.planLabel != null ? { planLabel: session.planLabel } : {})}
          focus={session.focus}
          date={session.date}
          durationMinutes={session.durationMinutes}
          exercises={session.exercises}
          onDelete={() => handleDelete(session.id)}
        />
      </View>
    )
  }

  if (sorted.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="font-ui text-[15px] tracking-[0.5px] text-muted">
          Nenhum treino registrado ainda.
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background px-5 pt-14">
      {/* Back navigation — chevron integrated with section label */}
      <View className="flex-row items-center">
        <Pressable
          testID="back-button"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
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
        <Text className="font-ui text-[10px] uppercase tracking-[3px] text-accent">TREINOS</Text>
      </View>
      <Text className="mb-4 font-display text-[28px] tracking-[1px] text-text">Historico</Text>

      {/* Workout count summary */}
      <View className="mb-4 flex-row items-center">
        <View className="h-[6px] w-[6px] rounded-full bg-accent" />
        <Text className="ml-2 font-ui text-[12px] text-muted">
          {sorted.length} {sorted.length === 1 ? 'treino' : 'treinos'} registrados
        </Text>
      </View>

      <FlashList
        data={sectionedData}
        renderItem={renderItem}
        keyExtractor={(item: HistoryListItem) => item.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        getItemType={(item: HistoryListItem) => item.type}
      />
    </View>
  )
}
