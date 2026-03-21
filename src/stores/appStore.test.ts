/**
 * appStore tests — Phase 1 (TDD: tests first, implementation second)
 *
 * These tests use the real Zustand store with a mocked MMKV storage layer.
 * The store module is resolved via jest.mock so it uses the in-memory mock.
 */

import type { WorkoutSession, WorkoutId, PlanId } from '@/types'
import { clearMockStorage } from '@/storage/__mocks__/mmkv'

jest.mock('@/storage/mmkv', () => require('@/storage/__mocks__/mmkv'))

// -- Test data factory --

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'A-1000' as WorkoutId,
    planId: 'A' as PlanId,
    planName: 'Treino A',
    focus: 'Peito / Ombros / Triceps',
    date: '2026-03-21',
    durationMinutes: 45,
    exercises: [{ name: 'Supino Reto', sets: 3, weight: 60 }],
    syncStatus: 'local',
    version: 1,
    createdAt: '2026-03-21T10:00:00.000Z',
    updatedAt: '2026-03-21T10:00:00.000Z',
    ...overrides,
  }
}

// -- Tests --

describe('appStore', () => {
  beforeEach(() => {
    clearMockStorage()
    jest.resetModules()
  })

  function getStore() {
    // Re-import to get a fresh store after resetModules
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAppStore } = require('@/stores/appStore') as typeof import('@/stores/appStore')
    return useAppStore
  }

  describe('saveWorkout', () => {
    it('adds session to history and updates lastDates[planId]', () => {
      const store = getStore()
      const session = makeSession()

      store.getState().saveWorkout(session)

      expect(store.getState().history).toHaveLength(1)
      expect(store.getState().history[0]).toEqual(session)
      expect(store.getState().lastDates['A']).toBe('2026-03-21')
    })

    it('is idempotent — duplicate ID is a no-op', () => {
      const store = getStore()
      const session = makeSession()

      store.getState().saveWorkout(session)
      store.getState().saveWorkout(session)

      expect(store.getState().history).toHaveLength(1)
    })
  })

  describe('updateLastWeights', () => {
    it('merges new weights into existing', () => {
      const store = getStore()

      store.getState().updateLastWeights({ 'supino-reto': 60 })
      store.getState().updateLastWeights({ 'rosca-direta': 30, 'supino-reto': 65 })

      expect(store.getState().lastWeights).toEqual({
        'supino-reto': 65,
        'rosca-direta': 30,
      })
    })
  })

  describe('deleteWorkout', () => {
    it('removes session and recalculates lastDates to most recent remaining', () => {
      const store = getStore()
      const session1 = makeSession({
        id: 'A-1000' as WorkoutId,
        date: '2026-03-19',
      })
      const session2 = makeSession({
        id: 'A-2000' as WorkoutId,
        date: '2026-03-21',
      })
      const session3 = makeSession({
        id: 'A-3000' as WorkoutId,
        date: '2026-03-20',
      })

      store.getState().saveWorkout(session1)
      store.getState().saveWorkout(session2)
      store.getState().saveWorkout(session3)

      // Delete the most recent (2026-03-21) — lastDates should fall back to 2026-03-20
      store.getState().deleteWorkout('A-2000' as WorkoutId)

      expect(store.getState().history).toHaveLength(2)
      expect(store.getState().lastDates['A']).toBe('2026-03-20')
    })

    it('removes lastDates key when no sessions remain for that plan', () => {
      const store = getStore()
      const session = makeSession()

      store.getState().saveWorkout(session)
      store.getState().deleteWorkout(session.id)

      expect(store.getState().history).toHaveLength(0)
      expect(store.getState().lastDates).not.toHaveProperty('A')
    })

    it('is a no-op when ID does not exist', () => {
      const store = getStore()
      const session = makeSession()

      store.getState().saveWorkout(session)
      store.getState().deleteWorkout('nonexistent' as WorkoutId)

      expect(store.getState().history).toHaveLength(1)
    })
  })

  describe('rehydration', () => {
    it('rehydrates from MMKV mock correctly', async () => {
      // Seed storage with persisted data in the format Zustand persist uses.
      // We must reset modules FIRST, then seed the fresh mock storage,
      // then import the store so it picks up the seeded data.
      jest.resetModules()
      jest.mock('@/storage/mmkv', () => require('@/storage/__mocks__/mmkv'))

      // Get the fresh mock storage instance (same one the store will use)
      const { mmkvStateStorage: mockStorage } =
        require('@/storage/__mocks__/mmkv') as typeof import('@/storage/__mocks__/mmkv')

      const persistedState = {
        state: {
          lastWeights: { 'supino-reto': 60 },
          lastDates: { A: '2026-03-21' },
          history: [makeSession()],
        },
        version: 1,
      }
      mockStorage.setItem('app-store', JSON.stringify(persistedState))

      // Now import the store — it will rehydrate from the seeded storage
      const { useAppStore } =
        require('@/stores/appStore') as typeof import('@/stores/appStore')

      // Wait for rehydration
      await new Promise<void>((resolve) => {
        if (useAppStore.persist.hasHydrated()) {
          resolve()
          return
        }
        const unsub = useAppStore.persist.onFinishHydration(() => {
          unsub()
          resolve()
        })
      })

      expect(useAppStore.getState().history).toHaveLength(1)
      expect(useAppStore.getState().history[0]?.id).toBe('A-1000')
      expect(useAppStore.getState().lastWeights['supino-reto']).toBe(60)
      expect(useAppStore.getState().lastDates['A']).toBe('2026-03-21')
    })
  })
})
