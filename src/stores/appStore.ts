import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import type { WorkoutSession, WorkoutId } from '@/types'
import { mmkvStateStorage } from '@/storage/mmkv'

/** Persistent app-level state: workout history, last weights, and last dates. */
export interface AppState {
  lastWeights: Record<string, number>
  lastDates: Partial<Record<string, string>>
  history: WorkoutSession[]
  saveWorkout: (session: WorkoutSession) => void
  updateLastWeights: (weights: Record<string, number>) => void
  deleteWorkout: (id: WorkoutId) => void
}

export const useAppStore = create<AppState>()(
  persist(
    devtools((set, get) => ({
      lastWeights: {},
      lastDates: {},
      history: [],

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
    })),
    {
      name: 'app-store',
      storage: createJSONStorage(() => mmkvStateStorage),
      version: 1,
      migrate: (state) => state as AppState,
    },
  ),
)
