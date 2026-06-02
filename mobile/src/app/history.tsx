import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Path, Circle } from 'react-native-svg'

import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import { sync, deleteSessionFromServer } from '@/services/syncService'
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

/** Formats an ISO timestamp as HH:MM. */
function formatTime(isoDate: string): string {
  const d = new Date(isoDate)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
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
  const lastSyncedAt = useAppStore((s) => s.lastSyncedAt)
  const isSyncing = useAppStore((s) => s.isSyncing)
  const syncError = useAppStore((s) => s.syncError)

  const user = useAuthStore((s) => s.user)
  const isAuthLoading = useAuthStore((s) => s.isLoading)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const signOut = useAuthStore((s) => s.signOut)

  // Sort by date descending, then createdAt descending for same-date workouts
  const sorted = [...history].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date)
    if (dateCompare !== 0) return dateCompare
    return b.createdAt.localeCompare(a.createdAt)
  })

  const sectionedData = buildSectionedList(sorted)

  const handleDelete = async (id: WorkoutId): Promise<void> => {
    deleteWorkout(id)
    // Best-effort delete from server — silent on failure
    deleteSessionFromServer(id).catch(() => {})
  }

  const handleSync = (): void => {
    sync().catch(() => {})
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

      {/* Sync panel */}
      <View className="mb-5 rounded-lg border border-border bg-surface px-4 py-3">
        {user ? (
          /* Logged in state */
          <View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                {/* User avatar placeholder */}
                <View className="h-[28px] w-[28px] items-center justify-center rounded-full bg-accent-dim">
                  <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
                    <Circle cx="8" cy="5" r="3" stroke="#C2F000" strokeWidth={1.2} />
                    <Path
                      d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5"
                      stroke="#C2F000"
                      strokeWidth={1.2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </View>
                <View>
                  <Text className="font-ui text-[12px] text-text" numberOfLines={1}>
                    {user.email}
                  </Text>
                  {syncError ? (
                    <Text className="font-ui text-[10px] text-danger">{syncError}</Text>
                  ) : lastSyncedAt ? (
                    <Text className="font-ui text-[10px] text-muted">
                      Sincronizado às {formatTime(lastSyncedAt)}
                    </Text>
                  ) : (
                    <Text className="font-ui text-[10px] text-muted">Nunca sincronizado</Text>
                  )}
                </View>
              </View>

              {/* Sync button */}
              <Pressable
                onPress={handleSync}
                disabled={isSyncing}
                accessibilityRole="button"
                accessibilityLabel="Sincronizar"
                className="h-[34px] w-[34px] items-center justify-center rounded-full border border-border-med"
              >
                {isSyncing ? (
                  <ActivityIndicator size={14} color="#888888" />
                ) : (
                  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                    <Path
                      d="M13.5 8A5.5 5.5 0 1 1 8 2.5"
                      stroke="#888888"
                      strokeWidth={1.4}
                      strokeLinecap="round"
                    />
                    <Path
                      d="M5.5 0.5L8 2.5L5.5 4.5"
                      stroke="#888888"
                      strokeWidth={1.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                )}
              </Pressable>
            </View>

            {/* Sign out */}
            <Pressable
              onPress={() => signOut()}
              accessibilityRole="button"
              accessibilityLabel="Sair da conta"
              className="mt-3 border-t border-border pt-3"
            >
              <Text className="font-ui text-[11px] text-dim">Sair da conta</Text>
            </Pressable>
          </View>
        ) : (
          /* Logged out state */
          <View>
            <View className="mb-3 flex-row items-center gap-2">
              <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                <Path
                  d="M3 13A5 5 0 0 1 3 3a6 6 0 0 1 10 1A3.5 3.5 0 0 1 13 13H3Z"
                  stroke="#555555"
                  strokeWidth={1.2}
                  strokeLinejoin="round"
                />
                <Path
                  d="M5 8.5L7 10.5L11 6.5"
                  stroke="#555555"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text className="font-ui text-[12px] text-text-med">
                Sincronize seu histórico na nuvem
              </Text>
            </View>
            <Text className="mb-3 font-ui text-[11px] leading-[16px] text-muted">
              Faça login para salvar seus treinos e recuperá-los em qualquer dispositivo.
            </Text>
            <Pressable
              onPress={() => signInWithGoogle()}
              disabled={isAuthLoading}
              accessibilityRole="button"
              accessibilityLabel="Entrar com Google"
              className="h-[38px] items-center justify-center rounded-pill border border-border-med bg-surface-2"
            >
              {isAuthLoading ? (
                <ActivityIndicator size={14} color="#888888" />
              ) : (
                <Text className="font-ui text-[12px] uppercase tracking-[1px] text-text-med">
                  Entrar com Google
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      {sorted.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="font-ui text-[15px] tracking-[0.5px] text-muted">
            Nenhum treino registrado ainda.
          </Text>
        </View>
      ) : (
        <>
          {/* Workout count summary */}
          <View className="mb-4 flex-row items-center">
            <View className="h-[6px] w-[6px] rounded-full bg-accent" />
            <Text className="ml-2 font-ui text-[12px] text-muted">
              {sorted.length} {sorted.length === 1 ? 'treino' : 'treinos'} registrados
            </Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            {sectionedData.map((item) => {
              if (item.type === 'header') {
                return (
                  <View key={item.key} className="mb-2 mt-4">
                    <Text className="font-ui text-[11px] uppercase tracking-[2px] text-dim">
                      {item.label}
                    </Text>
                  </View>
                )
              }
              const { session } = item
              return (
                <View key={item.key} className="mb-2">
                  <WorkoutHistoryCard
                    id={session.id}
                    planId={session.planId}
                    planName={session.planName}
                    {...(session.planLabel != null ? { planLabel: session.planLabel } : {})}
                    focus={session.focus}
                    date={session.date}
                    durationMinutes={session.durationMinutes}
                    exercises={session.exercises}
                    syncStatus={session.syncStatus}
                    onDelete={() => handleDelete(session.id)}
                  />
                </View>
              )
            })}
          </ScrollView>
        </>
      )}
    </View>
  )
}
