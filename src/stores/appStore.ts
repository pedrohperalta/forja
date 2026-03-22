import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import type { WorkoutSession, WorkoutId } from '@/types'
import { mmkvStateStorage } from '@/storage/mmkv'

/** Persistent app-level state: workout history, last weights, last dates, and equipment photos. */
export interface AppState {
  lastWeights: Record<string, number>
  lastDates: Partial<Record<string, string>>
  history: WorkoutSession[]
  equipmentPhotos: Record<string, string>
  saveWorkout: (session: WorkoutSession) => void
  updateLastWeights: (weights: Record<string, number>) => void
  deleteWorkout: (id: WorkoutId) => void
  saveEquipmentPhoto: (exerciseId: string, photoUri: string) => void
  deleteEquipmentPhoto: (exerciseId: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    devtools((set, get) => ({
      lastWeights: {},
      lastDates: {},
      history: [],
      equipmentPhotos: {},

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
    })),
    {
      name: 'app-store',
      storage: createJSONStorage(() => mmkvStateStorage),
      version: 2,
      migrate: (persisted) => {
        const state = persisted as unknown as Record<string, unknown>
        if (!state['equipmentPhotos']) {
          state['equipmentPhotos'] = {}
        }
        return state as unknown as AppState
      },
    },
  ),
)
