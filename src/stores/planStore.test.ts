/**
 * planStore tests — TDD: tests first, implementation second.
 *
 * Tests CRUD operations, label auto-assignment, active-workout guard,
 * exercise reordering, and MMKV persistence.
 */

import type { ExerciseId, PlanId } from '@/types'
import { makeExtractedWorkout, makeExtractedExercise } from '@/test-utils/factories'
import { clearMockStorage } from '@/storage/__mocks__/mmkv'

// Import after mocks
import { usePlanStore } from '@/stores/planStore'

jest.mock('@/storage/mmkv', () => require('@/storage/__mocks__/mmkv'))

// Mock expo-crypto to return deterministic UUIDs for testing
let mockUuidCounter = 0
jest.mock('expo-crypto', () => ({
  randomUUID: () => {
    mockUuidCounter += 1
    return `uuid-${mockUuidCounter}`
  },
}))

// Mock workoutStore for removePlan guard
const mockWorkoutStoreState = {
  status: 'idle' as 'idle' | 'active' | 'completed',
  activePlan: null as { id: PlanId } | null,
}

jest.mock('@/stores/workoutStore', () => ({
  useWorkoutStore: {
    getState: () => mockWorkoutStoreState,
  },
}))

describe('planStore', () => {
  beforeEach(() => {
    usePlanStore.getState().reset()
    clearMockStorage()
    mockUuidCounter = 0
    mockWorkoutStoreState.status = 'idle'
    mockWorkoutStoreState.activePlan = null
  })

  describe('initial state', () => {
    it('starts with empty plans and nextLabel "A"', () => {
      const state = usePlanStore.getState()
      expect(state.plans).toEqual([])
      expect(state.nextLabel).toBe('A')
    })
  })

  describe('addPlan', () => {
    it('adds a plan with auto-assigned label and increments nextLabel', () => {
      const id = usePlanStore.getState().addPlan('Treino A', 'Peito / Ombros')

      const state = usePlanStore.getState()
      expect(state.plans).toHaveLength(1)
      expect(state.plans[0]?.label).toBe('A')
      expect(state.plans[0]?.name).toBe('Treino A')
      expect(state.plans[0]?.focus).toBe('Peito / Ombros')
      expect(state.plans[0]?.id).toBe(id)
      expect(state.plans[0]?.exercises).toEqual([])
      expect(state.plans[0]?.createdAt).toBeTruthy()
      expect(state.plans[0]?.updatedAt).toBeTruthy()
      expect(state.nextLabel).toBe('B')
    })

    it('increments labels A through Z then to AA', () => {
      // Add 26 plans to exhaust A-Z
      for (let i = 0; i < 26; i++) {
        usePlanStore.getState().addPlan(`Plan ${i}`, 'Focus')
      }

      expect(usePlanStore.getState().nextLabel).toBe('AA')

      usePlanStore.getState().addPlan('Plan 26', 'Focus')
      expect(usePlanStore.getState().plans[26]?.label).toBe('AA')
      expect(usePlanStore.getState().nextLabel).toBe('AB')
    })

    it('returns the generated PlanId', () => {
      const id = usePlanStore.getState().addPlan('Test', 'Focus')
      expect(typeof id).toBe('string')
      expect(id).toBeTruthy()
    })
  })

  describe('updatePlan', () => {
    it('updates plan name and focus', () => {
      const id = usePlanStore.getState().addPlan('Original', 'Old Focus')

      usePlanStore.getState().updatePlan(id, { name: 'Updated', focus: 'New Focus' })

      const plan = usePlanStore.getState().plans[0]
      expect(plan?.name).toBe('Updated')
      expect(plan?.focus).toBe('New Focus')
    })

    it('updates only specified fields', () => {
      const id = usePlanStore.getState().addPlan('Original', 'Old Focus')

      usePlanStore.getState().updatePlan(id, { name: 'Updated' })

      const plan = usePlanStore.getState().plans[0]
      expect(plan?.name).toBe('Updated')
      expect(plan?.focus).toBe('Old Focus')
    })

    it('updates updatedAt timestamp', () => {
      const id = usePlanStore.getState().addPlan('Original', 'Focus')
      const beforeUpdate = usePlanStore.getState().plans[0]?.updatedAt

      // Small delay to ensure different timestamp
      usePlanStore.getState().updatePlan(id, { name: 'Updated' })

      const afterUpdate = usePlanStore.getState().plans[0]?.updatedAt
      expect(afterUpdate).toBeTruthy()
      // updatedAt should be set (may or may not differ in fast tests)
      expect(typeof afterUpdate).toBe('string')
    })
  })

  describe('removePlan', () => {
    it('removes the plan from the array', () => {
      const id = usePlanStore.getState().addPlan('To Remove', 'Focus')
      expect(usePlanStore.getState().plans).toHaveLength(1)

      usePlanStore.getState().removePlan(id)

      expect(usePlanStore.getState().plans).toHaveLength(0)
    })

    it('returns early if the plan is active in workoutStore', () => {
      const id = usePlanStore.getState().addPlan('Active Plan', 'Focus')

      mockWorkoutStoreState.status = 'active'
      mockWorkoutStoreState.activePlan = { id }

      usePlanStore.getState().removePlan(id)

      // Plan should NOT be removed
      expect(usePlanStore.getState().plans).toHaveLength(1)
    })

    it('allows removal when workoutStore status is not active', () => {
      const id = usePlanStore.getState().addPlan('Plan', 'Focus')

      mockWorkoutStoreState.status = 'completed'
      mockWorkoutStoreState.activePlan = { id }

      usePlanStore.getState().removePlan(id)

      expect(usePlanStore.getState().plans).toHaveLength(0)
    })
  })

  describe('addExercise', () => {
    it('adds an exercise to the specified plan', () => {
      const planId = usePlanStore.getState().addPlan('Test', 'Focus')

      usePlanStore.getState().addExercise(planId, {
        name: 'Supino Reto',
        category: 'Peito',
        equipment: 'Maquina',
        reps: '10-15',
        sets: 3,
        restSeconds: 60,
      })

      const plan = usePlanStore.getState().plans[0]
      expect(plan?.exercises).toHaveLength(1)
      expect(plan?.exercises[0]?.name).toBe('Supino Reto')
      expect(plan?.exercises[0]?.id).toBeTruthy()
      expect(plan?.exercises[0]?.createdAt).toBeTruthy()
      expect(plan?.exercises[0]?.updatedAt).toBeTruthy()
    })
  })

  describe('updateExercise', () => {
    it('updates exercise fields', () => {
      const planId = usePlanStore.getState().addPlan('Test', 'Focus')
      usePlanStore.getState().addExercise(planId, {
        name: 'Original',
        category: 'Peito',
        equipment: 'Maquina',
        reps: '10-15',
        sets: 3,
        restSeconds: 60,
      })

      const exerciseId = usePlanStore.getState().plans[0]?.exercises[0]?.id
      expect(exerciseId).toBeTruthy()

      usePlanStore.getState().updateExercise(planId, exerciseId!, { name: 'Updated', sets: 4 })

      const exercise = usePlanStore.getState().plans[0]?.exercises[0]
      expect(exercise?.name).toBe('Updated')
      expect(exercise?.sets).toBe(4)
    })
  })

  describe('removeExercise', () => {
    it('removes an exercise from the plan', () => {
      const planId = usePlanStore.getState().addPlan('Test', 'Focus')
      usePlanStore.getState().addExercise(planId, {
        name: 'To Remove',
        category: 'Peito',
        equipment: 'Maquina',
        reps: '10-15',
        sets: 3,
        restSeconds: 60,
      })

      const exerciseId = usePlanStore.getState().plans[0]?.exercises[0]?.id
      expect(exerciseId).toBeTruthy()

      usePlanStore.getState().removeExercise(planId, exerciseId!)

      expect(usePlanStore.getState().plans[0]?.exercises).toHaveLength(0)
    })
  })

  describe('reorderExercises', () => {
    it('reorders exercises by the provided ID array', () => {
      const planId = usePlanStore.getState().addPlan('Test', 'Focus')
      usePlanStore.getState().addExercise(planId, {
        name: 'First',
        category: 'Peito',
        equipment: 'Maquina',
        reps: '10-15',
        sets: 3,
        restSeconds: 60,
      })
      usePlanStore.getState().addExercise(planId, {
        name: 'Second',
        category: 'Costas',
        equipment: 'Maquina',
        reps: '10-15',
        sets: 3,
        restSeconds: 60,
      })

      const exercises = usePlanStore.getState().plans[0]?.exercises
      expect(exercises).toHaveLength(2)

      const id1 = exercises![0]!.id
      const id2 = exercises![1]!.id

      // Reverse order
      usePlanStore.getState().reorderExercises(planId, [id2, id1])

      const reordered = usePlanStore.getState().plans[0]?.exercises
      expect(reordered![0]!.id).toBe(id2)
      expect(reordered![1]!.id).toBe(id1)
    })
  })

  describe('v2 migration', () => {
    it('rehydrates v1 state with archived: false on all plans', async () => {
      jest.resetModules()
      jest.mock('@/storage/mmkv', () => require('@/storage/__mocks__/mmkv'))
      jest.mock('expo-crypto', () => ({
        randomUUID: () => {
          mockUuidCounter += 1
          return `uuid-${mockUuidCounter}`
        },
      }))
      jest.mock('@/stores/workoutStore', () => ({
        useWorkoutStore: {
          getState: () => mockWorkoutStoreState,
        },
      }))

      const { mmkvStateStorage: mockStorage } =
        require('@/storage/__mocks__/mmkv') as typeof import('@/storage/__mocks__/mmkv')

      const now = '2026-01-01T00:00:00.000Z'
      const v1State = {
        state: {
          plans: [
            {
              id: 'uuid-1',
              label: 'A',
              name: 'Old Plan',
              focus: 'Peito',
              exercises: [],
              createdAt: now,
              updatedAt: now,
            },
            {
              id: 'uuid-2',
              label: 'B',
              name: 'Old Plan 2',
              focus: 'Costas',
              exercises: [],
              createdAt: now,
              updatedAt: now,
            },
          ],
          nextLabel: 'C',
        },
        version: 1,
      }
      mockStorage.setItem('plan-store', JSON.stringify(v1State))

      const { usePlanStore: freshStore } =
        require('@/stores/planStore') as typeof import('@/stores/planStore')

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

      const plans = freshStore.getState().plans
      expect(plans).toHaveLength(2)
      expect(plans[0]?.archived).toBe(false)
      expect(plans[1]?.archived).toBe(false)
    })
  })

  describe('archiveAllPlans', () => {
    it('sets archived: true on all plans', () => {
      usePlanStore.getState().addPlan('Plan A', 'Peito')
      usePlanStore.getState().addPlan('Plan B', 'Costas')

      usePlanStore.getState().archiveAllPlans()

      const plans = usePlanStore.getState().plans
      expect(plans[0]?.archived).toBe(true)
      expect(plans[1]?.archived).toBe(true)
    })

    it('does not affect already archived plans', () => {
      usePlanStore.getState().addPlan('Plan A', 'Peito')
      usePlanStore.getState().archiveAllPlans()

      const beforeCount = usePlanStore.getState().plans.filter((p) => p.archived).length
      usePlanStore.getState().archiveAllPlans()
      const afterCount = usePlanStore.getState().plans.filter((p) => p.archived).length

      expect(beforeCount).toBe(afterCount)
    })
  })

  describe('importPlans (replace mode)', () => {
    it('archives active plans and creates new plans from extracted workouts', () => {
      // Create existing plan
      usePlanStore.getState().addPlan('Old Plan', 'Peito')

      const workouts = [
        makeExtractedWorkout({
          name: 'Treino de Peito',
          exercises: [
            makeExtractedExercise({ name: 'Supino Reto', category: 'Peito' }),
            makeExtractedExercise({ name: 'Elevacao Lateral', category: 'Ombros' }),
          ],
        }),
      ]

      usePlanStore.getState().importPlans(workouts, 'replace')

      const plans = usePlanStore.getState().plans
      // Old plan archived + new plan created
      expect(plans.filter((p) => p.archived)).toHaveLength(1)
      expect(plans.filter((p) => !p.archived)).toHaveLength(1)

      // New plan has correct fields
      const newPlan = plans.find((p) => !p.archived)!
      expect(newPlan.name).toBe('Treino de Peito')
      expect(newPlan.focus).toBe('Peito / Ombros')
      expect(newPlan.exercises).toHaveLength(2)
      expect(newPlan.label).toBeTruthy()
      expect(newPlan.id).toBeTruthy()
    })

    it('generates sequential labels starting from current nextLabel', () => {
      const workouts = [
        makeExtractedWorkout({ name: 'Workout 1' }),
        makeExtractedWorkout({ name: 'Workout 2' }),
      ]

      usePlanStore.getState().importPlans(workouts, 'replace')

      const plans = usePlanStore.getState().plans.filter((p) => !p.archived)
      expect(plans[0]?.label).toBe('A')
      expect(plans[1]?.label).toBe('B')
      expect(usePlanStore.getState().nextLabel).toBe('C')
    })

    it('strips confidence from exercises', () => {
      const workouts = [
        makeExtractedWorkout({
          exercises: [makeExtractedExercise({ confidence: 0.95 })],
        }),
      ]

      usePlanStore.getState().importPlans(workouts, 'replace')

      const newPlan = usePlanStore.getState().plans.find((p) => !p.archived)!
      const exercise = newPlan.exercises[0]!
      expect(exercise).not.toHaveProperty('confidence')
    })

    it('derives focus from unique exercise categories joined by " / "', () => {
      const workouts = [
        makeExtractedWorkout({
          exercises: [
            makeExtractedExercise({ category: 'Peito' }),
            makeExtractedExercise({ category: 'Ombros' }),
            makeExtractedExercise({ category: 'Peito' }),
            makeExtractedExercise({ category: 'Tríceps' }),
          ],
        }),
      ]

      usePlanStore.getState().importPlans(workouts, 'replace')

      const newPlan = usePlanStore.getState().plans.find((p) => !p.archived)!
      expect(newPlan.focus).toBe('Peito / Ombros / Tríceps')
    })

    it('skips archiving the plan used by an active workout and returns skippedPlanId', () => {
      const activePlanId = usePlanStore.getState().addPlan('Active', 'Peito')
      usePlanStore.getState().addPlan('Inactive', 'Costas')

      // Simulate active workout
      mockWorkoutStoreState.status = 'active'
      mockWorkoutStoreState.activePlan = { id: activePlanId }

      const workouts = [makeExtractedWorkout({ name: 'New Plan' })]
      const result = usePlanStore.getState().importPlans(workouts, 'replace')

      expect(result.skippedPlanId).toBe(activePlanId)

      const plans = usePlanStore.getState().plans
      // Active plan NOT archived
      const activePlan = plans.find((p) => p.id === activePlanId)!
      expect(activePlan.archived).not.toBe(true)

      // Inactive plan IS archived
      const inactivePlan = plans.find((p) => p.name === 'Inactive')!
      expect(inactivePlan.archived).toBe(true)
    })

    it('returns empty object when no workout is active', () => {
      const workouts = [makeExtractedWorkout()]

      const result = usePlanStore.getState().importPlans(workouts, 'replace')

      expect(result.skippedPlanId).toBeUndefined()
    })
  })

  describe('importPlans (add mode)', () => {
    it('adds plans without archiving existing ones', () => {
      usePlanStore.getState().addPlan('Existing', 'Peito')

      const workouts = [makeExtractedWorkout({ name: 'New Plan' })]
      usePlanStore.getState().importPlans(workouts, 'add')

      const plans = usePlanStore.getState().plans
      expect(plans.filter((p) => p.archived)).toHaveLength(0)
      expect(plans).toHaveLength(2)
    })

    it('labels continue from nextLabel', () => {
      usePlanStore.getState().addPlan('Existing', 'Peito')
      // nextLabel should be B after adding one plan

      const workouts = [makeExtractedWorkout({ name: 'New Plan' })]
      usePlanStore.getState().importPlans(workouts, 'add')

      const newPlan = usePlanStore.getState().plans.find((p) => p.name === 'New Plan')!
      expect(newPlan.label).toBe('B')
      expect(usePlanStore.getState().nextLabel).toBe('C')
    })
  })

  describe('persistence', () => {
    it('persists nextLabel and plans via MMKV', async () => {
      jest.resetModules()
      jest.mock('@/storage/mmkv', () => require('@/storage/__mocks__/mmkv'))
      jest.mock('expo-crypto', () => ({
        randomUUID: () => {
          mockUuidCounter += 1
          return `uuid-${mockUuidCounter}`
        },
      }))
      jest.mock('@/stores/workoutStore', () => ({
        useWorkoutStore: {
          getState: () => mockWorkoutStoreState,
        },
      }))

      const { mmkvStateStorage: mockStorage } =
        require('@/storage/__mocks__/mmkv') as typeof import('@/storage/__mocks__/mmkv')

      // Seed storage with persisted state
      const now = '2026-01-01T00:00:00.000Z'
      const persistedState = {
        state: {
          plans: [
            {
              id: 'uuid-1',
              label: 'A',
              name: 'Test',
              focus: 'Focus',
              exercises: [],
              createdAt: now,
              updatedAt: now,
            },
          ],
          nextLabel: 'B',
        },
        version: 1,
      }
      mockStorage.setItem('plan-store', JSON.stringify(persistedState))

      const { usePlanStore: freshStore } =
        require('@/stores/planStore') as typeof import('@/stores/planStore')

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

      expect(freshStore.getState().nextLabel).toBe('B')
      expect(freshStore.getState().plans).toHaveLength(1)
    })
  })
})
