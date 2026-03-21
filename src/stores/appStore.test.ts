/**
 * appStore tests — Phase 1 (TDD: tests first, implementation second)
 *
 * Uses a direct import of the store with state reset between tests.
 * The MMKV storage is mocked to use an in-memory Map.
 */

jest.mock('@/storage/mmkv', () => require('@/storage/__mocks__/mmkv'))

import type { WorkoutSession, WorkoutId, PlanId } from '@/types'
import { clearMockStorage } from '@/storage/__mocks__/mmkv'
import { useAppStore } from '@/stores/appStore'

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
    // Reset store state to defaults and clear persisted storage
    useAppStore.setState({ lastWeights: {}, lastDates: {}, history: [] })
    clearMockStorage()
  })

  describe('saveWorkout', () => {
    it('adds session to history and updates lastDates[planId]', () => {
      const session = makeSession()

      useAppStore.getState().saveWorkout(session)

      expect(useAppStore.getState().history).toHaveLength(1)
      expect(useAppStore.getState().history[0]).toEqual(session)
      expect(useAppStore.getState().lastDates['A']).toBe('2026-03-21')
    })

    it('is idempotent — duplicate ID is a no-op', () => {
      const session = makeSession()

      useAppStore.getState().saveWorkout(session)
      useAppStore.getState().saveWorkout(session)

      expect(useAppStore.getState().history).toHaveLength(1)
    })
  })

  describe('updateLastWeights', () => {
    it('merges new weights into existing', () => {
      useAppStore.getState().updateLastWeights({ 'supino-reto': 60 })
      useAppStore.getState().updateLastWeights({ 'rosca-direta': 30, 'supino-reto': 65 })

      expect(useAppStore.getState().lastWeights).toEqual({
        'supino-reto': 65,
        'rosca-direta': 30,
      })
    })
  })

  describe('deleteWorkout', () => {
    it('removes session and recalculates lastDates to most recent remaining', () => {
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

      useAppStore.getState().saveWorkout(session1)
      useAppStore.getState().saveWorkout(session2)
      useAppStore.getState().saveWorkout(session3)

      // Delete the most recent (2026-03-21) — lastDates should fall back to 2026-03-20
      useAppStore.getState().deleteWorkout('A-2000' as WorkoutId)

      expect(useAppStore.getState().history).toHaveLength(2)
      expect(useAppStore.getState().lastDates['A']).toBe('2026-03-20')
    })

    it('removes lastDates key when no sessions remain for that plan', () => {
      const session = makeSession()

      useAppStore.getState().saveWorkout(session)
      useAppStore.getState().deleteWorkout(session.id)

      expect(useAppStore.getState().history).toHaveLength(0)
      expect(useAppStore.getState().lastDates).not.toHaveProperty('A')
    })

    it('is a no-op when ID does not exist', () => {
      const session = makeSession()

      useAppStore.getState().saveWorkout(session)
      useAppStore.getState().deleteWorkout('nonexistent' as WorkoutId)

      expect(useAppStore.getState().history).toHaveLength(1)
    })
  })

  describe('rehydration', () => {
    it('rehydrates from MMKV mock correctly', async () => {
      // Reset modules so we get a fresh store that reads from seeded storage
      jest.resetModules()
      jest.mock('@/storage/mmkv', () => require('@/storage/__mocks__/mmkv'))

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

      const { useAppStore: freshStore } =
        require('@/stores/appStore') as typeof import('@/stores/appStore')

      await new Promise<void>((resolve) => {
        if (freshStore.persist.hasHydrated()) {
          resolve()
          return
        }
        const unsub = freshStore.persist.onFinishHydration(() => {
          unsub()
          resolve()
        })
      })

      expect(freshStore.getState().history).toHaveLength(1)
      expect(freshStore.getState().history[0]?.id).toBe('A-1000')
      expect(freshStore.getState().lastWeights['supino-reto']).toBe(60)
      expect(freshStore.getState().lastDates['A']).toBe('2026-03-21')
    })
  })
})
