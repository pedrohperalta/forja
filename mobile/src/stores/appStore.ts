import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import type { WorkoutSession, WorkoutId } from '@/types'
import { mmkvStateStorage } from '@/storage/mmkv'

/** Derives the most recent workout date per plan from a history array. */
function buildLastDates(history: WorkoutSession[]): Partial<Record<string, string>> {
  const result: Partial<Record<string, string>> = {}
  for (const session of history) {
    const current = result[session.planId]
    if (!current || session.date > current) {
      result[session.planId] = session.date
    }
  }
  return result
}

/** Persistent app-level state: workout history, last weights, last dates, and equipment photos. */
export interface AppState {
  lastWeights: Record<string, number>
  lastDates: Partial<Record<string, string>>
  history: WorkoutSession[]
  equipmentPhotos: Record<string, string>
  lastSyncedAt: string | null
  // Transient sync UI state (not persisted)
  isSyncing: boolean
  syncError: string | null
  saveWorkout: (session: WorkoutSession) => void
  updateLastWeights: (weights: Record<string, number>) => void
  deleteWorkout: (id: WorkoutId) => void
  saveEquipmentPhoto: (exerciseId: string, photoUri: string) => void
  deleteEquipmentPhoto: (exerciseId: string) => void
  markSessionsSynced: (ids: WorkoutId[]) => void
  mergeSessionsFromServer: (sessions: WorkoutSession[]) => void
  setLastSyncedAt: (date: string) => void
  setSyncState: (isSyncing: boolean, error: string | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    devtools((set, get) => ({
      lastWeights: {},
      lastDates: {},
      history: [],
      equipmentPhotos: {},
      lastSyncedAt: null,
      isSyncing: false,
      syncError: null,

      saveWorkout: (session: WorkoutSession): void => {
        const { history } = get()
        // Idempotent: skip if session already exists
        if (history.some((w) => w.id === session.id)) return
        set({
          history: [...history, session],
          lastDates: { ...get().lastDates, [session.planId]: session.date },
        })
      },

      updateLastWeights: (weights: Record<string, number>): void => {
        set({ lastWeights: { ...get().lastWeights, ...weights } })
      },

      deleteWorkout: (id: WorkoutId): void => {
        const { history } = get()
        const session = history.find((w) => w.id === id)
        if (!session) return

        const remaining = history.filter((w) => w.id !== id)
        const planSessions = remaining
          .filter((w) => w.planId === session.planId)
          .sort((a, b) => (b.date > a.date ? 1 : -1))

        const mostRecent = planSessions[0]

        if (mostRecent) {
          set({
            history: remaining,
            lastDates: { ...get().lastDates, [session.planId]: mostRecent.date },
          })
        } else {
          // Remove key entirely (exactOptionalPropertyTypes: cannot assign undefined)
          const { [session.planId]: _, ...rest } = get().lastDates
          set({
            history: remaining,
            lastDates: rest,
          })
        }
      },

      saveEquipmentPhoto: (exerciseId: string, photoUri: string): void => {
        set({ equipmentPhotos: { ...get().equipmentPhotos, [exerciseId]: photoUri } })
      },

      deleteEquipmentPhoto: (exerciseId: string): void => {
        const { [exerciseId]: _, ...rest } = get().equipmentPhotos
        set({ equipmentPhotos: rest })
      },

      markSessionsSynced: (ids: WorkoutId[]): void => {
        const idSet = new Set<string>(ids)
        set({
          history: get().history.map((s) =>
            idSet.has(s.id) ? { ...s, syncStatus: 'synced' as const } : s,
          ),
        })
      },

      mergeSessionsFromServer: (serverSessions: WorkoutSession[]): void => {
        const local = get().history
        const localIds = new Set(local.map((s) => s.id))

        // Add sessions from server not present locally (e.g. after reinstall)
        const newSessions = serverSessions.filter((s) => !localIds.has(s.id))

        // Mark existing sessions as synced if confirmed on server
        const serverIds = new Set(serverSessions.map((s) => s.id))
        const updated = local.map((s) =>
          serverIds.has(s.id) ? { ...s, syncStatus: 'synced' as const } : s,
        )

        const merged = [...updated, ...newSessions]
        set({ history: merged, lastDates: buildLastDates(merged) })
      },

      setLastSyncedAt: (date: string): void => {
        set({ lastSyncedAt: date })
      },

      setSyncState: (isSyncing: boolean, error: string | null): void => {
        set({ isSyncing, syncError: error })
      },
    })),
    {
      name: 'app-store',
      storage: createJSONStorage(() => mmkvStateStorage),
      version: 3,
      migrate: (persisted) => {
        const state = persisted as unknown as Record<string, unknown>
        if (!state['equipmentPhotos']) {
          state['equipmentPhotos'] = {}
        }
        if (!('lastSyncedAt' in state)) {
          state['lastSyncedAt'] = null
        }
        return state as unknown as AppState
      },
      // isSyncing and syncError are transient — do not persist
      partialize: (state) => ({
        lastWeights: state.lastWeights,
        lastDates: state.lastDates,
        history: state.history,
        equipmentPhotos: state.equipmentPhotos,
        lastSyncedAt: state.lastSyncedAt,
      }),
    },
  ),
)
