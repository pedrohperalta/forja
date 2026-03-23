/**
 * workoutStore tests — Phase 3 (TDD: tests first, implementation second)
 *
 * Uses a direct import of the store. The store is reset via its own reset()
 * action and clearMockStorage() between tests to avoid persist rehydration
 * interference.
 */

import type { ExerciseId, NavigationTarget } from '@/types'
import { clearMockStorage } from '@/storage/__mocks__/mmkv'
import { useWorkoutStore } from '@/stores/workoutStore'
import { makeExercise, makePlan } from '@/test-utils/factories'

jest.mock('@/storage/mmkv', () => require('@/storage/__mocks__/mmkv'))

// -- Tests --

describe('workoutStore', () => {
  beforeEach(() => {
    // Reset store state and clear persisted storage
    useWorkoutStore.getState().reset()
    clearMockStorage()
  })

  describe('startWorkout', () => {
    it('initializes all fields with status=active', () => {
      const plan = makePlan()

      useWorkoutStore.getState().startWorkout(plan)

      const state = useWorkoutStore.getState()
      expect(state.status).toBe('active')
      expect(state.activePlan).toEqual(plan)
      expect(state.queue).toEqual(plan.exercises)
      expect(state.skippedIds).toEqual([])
      expect(state.currentSet).toBe(1)
      expect(state.currentSets).toEqual([])
      expect(state.log).toEqual([])
      expect(state.startedAt).toEqual(expect.any(Number))
      expect(state.completedAt).toBeNull()
    })
  })

  describe('completeSet', () => {
    it('mid-exercise (set 1->2) returns {target:"rest"} and increments currentSet', () => {
      const plan = makePlan()
      useWorkoutStore.getState().startWorkout(plan)

      const result: NavigationTarget = useWorkoutStore.getState().completeSet(60)

      expect(result).toEqual({ target: 'rest', restSeconds: 60 })
      expect(useWorkoutStore.getState().currentSet).toBe(2)
      expect(useWorkoutStore.getState().currentSets).toHaveLength(1)
      expect(useWorkoutStore.getState().currentSets[0]?.weight).toBe(60)
    })

    it('last set of exercise returns {target:"rest"} when more non-skipped exist, logs exercise, removes from queue by ID', () => {
      const plan = makePlan()
      useWorkoutStore.getState().startWorkout(plan)

      // Complete all 3 sets of exercise 'ex-1'
      useWorkoutStore.getState().completeSet(60) // set 1 -> 2
      useWorkoutStore.getState().completeSet(60) // set 2 -> 3
      const result: NavigationTarget = useWorkoutStore.getState().completeSet(65) // set 3 (last)

      expect(result).toEqual({ target: 'rest', restSeconds: 60 })

      // Exercise should be logged
      expect(useWorkoutStore.getState().log).toHaveLength(1)
      expect(useWorkoutStore.getState().log[0]?.exerciseId).toBe('ex-1')
      expect(useWorkoutStore.getState().log[0]?.sets).toHaveLength(3)

      // Exercise should be removed from queue by ID
      expect(useWorkoutStore.getState().queue).toHaveLength(2)
      expect(
        useWorkoutStore.getState().queue.find((e) => e.id === ('ex-1' as ExerciseId)),
      ).toBeUndefined()

      // currentSet and currentSets should be reset
      expect(useWorkoutStore.getState().currentSet).toBe(1)
      expect(useWorkoutStore.getState().currentSets).toEqual([])
    })

    it('last set of last exercise returns {target:"complete"}', () => {
      // Plan with only one exercise (2 sets)
      const plan = makePlan({
        exercises: [makeExercise('ex-only', { sets: 2 })],
      })
      useWorkoutStore.getState().startWorkout(plan)

      useWorkoutStore.getState().completeSet(50) // set 1 -> 2
      const result: NavigationTarget = useWorkoutStore.getState().completeSet(55) // set 2 (last)

      expect(result).toEqual({ target: 'complete' })
      expect(useWorkoutStore.getState().queue).toHaveLength(0)
      expect(useWorkoutStore.getState().log).toHaveLength(1)
    })

    it('last set when all remaining are skipped returns {target:"checkpoint"}', () => {
      const plan = makePlan({
        exercises: [makeExercise('ex-1', { sets: 1 }), makeExercise('ex-2', { sets: 1 }), makeExercise('ex-3', { sets: 1 })],
      })
      useWorkoutStore.getState().startWorkout(plan)

      // 1. skipExercise() -> skips ex-1 (current), current becomes ex-2
      // 2. skipExercise() -> skips ex-2, current becomes ex-3
      // 3. completeSet on ex-3 (1 set) -> removes ex-3, remaining [ex-1, ex-2] both skipped
      useWorkoutStore.getState().skipExercise()
      useWorkoutStore.getState().skipExercise()

      const result: NavigationTarget = useWorkoutStore.getState().completeSet(50)

      expect(result).toEqual({ target: 'checkpoint' })
      expect(useWorkoutStore.getState().queue).toHaveLength(2)
      expect(useWorkoutStore.getState().skippedIds).toContain('ex-1')
      expect(useWorkoutStore.getState().skippedIds).toContain('ex-2')
    })
  })

  describe('skipExercise', () => {
    it('adds to skippedIds, resets currentSet/currentSets, returns correct target', () => {
      const plan = makePlan()
      useWorkoutStore.getState().startWorkout(plan)

      // Complete one set to have non-default currentSet/currentSets
      useWorkoutStore.getState().completeSet(60)

      const result: NavigationTarget = useWorkoutStore.getState().skipExercise()

      expect(result).toEqual({ target: 'next' })
      expect(useWorkoutStore.getState().skippedIds).toContain('ex-1')
      expect(useWorkoutStore.getState().currentSet).toBe(1)
      expect(useWorkoutStore.getState().currentSets).toEqual([])
    })

    it('when last non-skipped returns {target:"checkpoint"}', () => {
      const plan = makePlan({
        exercises: [makeExercise('ex-1'), makeExercise('ex-2')],
      })
      useWorkoutStore.getState().startWorkout(plan)

      // Skip ex-1 -> current becomes ex-2
      useWorkoutStore.getState().skipExercise()

      // Skip ex-2 -> all are skipped
      const result: NavigationTarget = useWorkoutStore.getState().skipExercise()

      expect(result).toEqual({ target: 'checkpoint' })
      expect(useWorkoutStore.getState().skippedIds).toHaveLength(2)
    })
  })

  describe('removeExercise', () => {
    it('(no param) removes current exercise, returns correct target', () => {
      const plan = makePlan()
      useWorkoutStore.getState().startWorkout(plan)

      const result: NavigationTarget = useWorkoutStore.getState().removeExercise()

      expect(result).toEqual({ target: 'next' })
      expect(useWorkoutStore.getState().queue).toHaveLength(2)
      expect(
        useWorkoutStore.getState().queue.find((e) => e.id === ('ex-1' as ExerciseId)),
      ).toBeUndefined()
    })

    it('(with param) removes specific exercise from checkpoint', () => {
      const plan = makePlan()
      useWorkoutStore.getState().startWorkout(plan)

      // Skip ex-1 so it's in skippedIds
      useWorkoutStore.getState().skipExercise()

      // Remove ex-1 by ID (from checkpoint)
      const result: NavigationTarget = useWorkoutStore
        .getState()
        .removeExercise('ex-1' as ExerciseId)

      expect(result).toEqual({ target: 'next' })
      expect(useWorkoutStore.getState().queue).toHaveLength(2)
      expect(
        useWorkoutStore.getState().queue.find((e) => e.id === ('ex-1' as ExerciseId)),
      ).toBeUndefined()
      expect(useWorkoutStore.getState().skippedIds).not.toContain('ex-1')
    })

    it('resets currentSet/currentSets only when removing current exercise', () => {
      const plan = makePlan()
      useWorkoutStore.getState().startWorkout(plan)

      // Complete one set so currentSet = 2
      useWorkoutStore.getState().completeSet(60)
      expect(useWorkoutStore.getState().currentSet).toBe(2)
      expect(useWorkoutStore.getState().currentSets).toHaveLength(1)

      // Skip ex-1 (resets currentSet/currentSets)
      useWorkoutStore.getState().skipExercise()
      // Now on ex-2, complete one set
      useWorkoutStore.getState().completeSet(70)
      expect(useWorkoutStore.getState().currentSet).toBe(2)
      expect(useWorkoutStore.getState().currentSets).toHaveLength(1)

      // Remove ex-1 by ID (NOT current) — should NOT reset currentSet/currentSets
      useWorkoutStore.getState().removeExercise('ex-1' as ExerciseId)
      expect(useWorkoutStore.getState().currentSet).toBe(2)
      expect(useWorkoutStore.getState().currentSets).toHaveLength(1)

      // Remove current exercise (ex-2) — SHOULD reset currentSet/currentSets
      useWorkoutStore.getState().removeExercise()
      expect(useWorkoutStore.getState().currentSet).toBe(1)
      expect(useWorkoutStore.getState().currentSets).toEqual([])
    })

    it('returns {target:"complete"} when removing the last exercise', () => {
      const plan = makePlan({
        exercises: [makeExercise('ex-only')],
      })
      useWorkoutStore.getState().startWorkout(plan)

      const result: NavigationTarget = useWorkoutStore.getState().removeExercise()

      expect(result).toEqual({ target: 'complete' })
      expect(useWorkoutStore.getState().queue).toHaveLength(0)
    })

    it('returns {target:"checkpoint"} when all remaining are skipped after removal', () => {
      const plan = makePlan({
        exercises: [makeExercise('ex-1'), makeExercise('ex-2'), makeExercise('ex-3')],
      })
      useWorkoutStore.getState().startWorkout(plan)

      // Skip ex-1 then ex-2 (both go to skippedIds, current advances)
      useWorkoutStore.getState().skipExercise()
      useWorkoutStore.getState().skipExercise()

      // Remove current (ex-3) — remaining are ex-1, ex-2 (both skipped)
      const result: NavigationTarget = useWorkoutStore.getState().removeExercise()

      expect(result).toEqual({ target: 'checkpoint' })
    })
  })

  describe('returnToSkipped', () => {
    it('removes from skippedIds, does NOT reset currentSet/currentSets', () => {
      const plan = makePlan()
      useWorkoutStore.getState().startWorkout(plan)

      // Skip ex-1
      useWorkoutStore.getState().skipExercise()

      // Complete one set of ex-2
      useWorkoutStore.getState().completeSet(70)

      // Return ex-1 to active
      useWorkoutStore.getState().returnToSkipped('ex-1' as ExerciseId)

      expect(useWorkoutStore.getState().skippedIds).not.toContain('ex-1')
      // currentSet/currentSets preserved
      expect(useWorkoutStore.getState().currentSet).toBe(2)
      expect(useWorkoutStore.getState().currentSets).toHaveLength(1)
    })
  })

  describe('complete', () => {
    it('sets status=completed and completedAt', () => {
      const plan = makePlan()
      useWorkoutStore.getState().startWorkout(plan)

      const beforeComplete = Date.now()
      useWorkoutStore.getState().complete()
      const afterComplete = Date.now()

      expect(useWorkoutStore.getState().status).toBe('completed')
      expect(useWorkoutStore.getState().completedAt).toBeGreaterThanOrEqual(beforeComplete)
      expect(useWorkoutStore.getState().completedAt).toBeLessThanOrEqual(afterComplete)
    })
  })

  describe('reset', () => {
    it('restores all fields to idle defaults', () => {
      const plan = makePlan()
      useWorkoutStore.getState().startWorkout(plan)
      useWorkoutStore.getState().completeSet(60)
      useWorkoutStore.getState().complete()

      useWorkoutStore.getState().reset()

      const state = useWorkoutStore.getState()
      expect(state.status).toBe('idle')
      expect(state.activePlan).toBeNull()
      expect(state.queue).toEqual([])
      expect(state.skippedIds).toEqual([])
      expect(state.currentSet).toBe(1)
      expect(state.currentSets).toEqual([])
      expect(state.log).toEqual([])
      expect(state.startedAt).toBeNull()
      expect(state.completedAt).toBeNull()
    })
  })

  describe('rehydration', () => {
    it('rehydrates from MMKV mock correctly', async () => {
      // Reset modules so we get a fresh store that reads from seeded storage
      jest.resetModules()
      jest.mock('@/storage/mmkv', () => require('@/storage/__mocks__/mmkv'))

      const { mmkvStateStorage: mockStorage } =
        require('@/storage/__mocks__/mmkv') as typeof import('@/storage/__mocks__/mmkv')

      const plan = makePlan()
      const persistedState = {
        state: {
          status: 'active',
          activePlan: plan,
          queue: plan.exercises,
          skippedIds: [],
          currentSet: 2,
          currentSets: [{ weight: 60, completedAt: 1000 }],
          log: [],
          startedAt: 1000,
          completedAt: null,
        },
        version: 1,
      }
      mockStorage.setItem('workout-store', JSON.stringify(persistedState))

      const { useWorkoutStore: freshStore } =
        require('@/stores/workoutStore') as typeof import('@/stores/workoutStore')

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

      expect(freshStore.getState().status).toBe('active')
      expect(freshStore.getState().activePlan).toEqual(plan)
      expect(freshStore.getState().currentSet).toBe(2)
      expect(freshStore.getState().currentSets).toHaveLength(1)
      expect(freshStore.getState().startedAt).toBe(1000)
      expect(freshStore.getState().completedAt).toBeNull()
    })
  })
})
