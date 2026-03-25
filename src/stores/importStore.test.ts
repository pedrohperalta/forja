/**
 * importStore tests — TDD: tests first, implementation second.
 *
 * Tests ephemeral import flow state: photos, workouts, mode, status,
 * skippedPlanId, and all actions.
 */

import type { PlanId } from '@/types'
import { makeExtractedWorkout } from '@/test-utils/factories'

import { useImportStore } from '@/stores/importStore'

// Mock planStore for confirmImport
const mockImportPlans = jest.fn().mockReturnValue({})

jest.mock('@/stores/planStore', () => ({
  usePlanStore: {
    getState: () => ({
      importPlans: mockImportPlans,
    }),
  },
}))

describe('importStore', () => {
  beforeEach(() => {
    useImportStore.getState().reset()
    jest.clearAllMocks()
    mockImportPlans.mockReturnValue({})
  })

  describe('initial state', () => {
    it('starts with empty photos, workouts, replace mode, idle status, null skippedPlanId', () => {
      const state = useImportStore.getState()
      expect(state.photos).toEqual([])
      expect(state.workouts).toEqual([])
      expect(state.mode).toBe('replace')
      expect(state.status).toBe('idle')
      expect(state.skippedPlanId).toBeNull()
    })
  })

  describe('addPhoto', () => {
    it('adds a photo with pending status', () => {
      useImportStore.getState().addPhoto('file:///photo1.jpg')

      const photos = useImportStore.getState().photos
      expect(photos).toHaveLength(1)
      expect(photos[0]).toEqual({ uri: 'file:///photo1.jpg', status: 'pending' })
    })

    it('adds multiple photos', () => {
      useImportStore.getState().addPhoto('file:///photo1.jpg')
      useImportStore.getState().addPhoto('file:///photo2.jpg')

      expect(useImportStore.getState().photos).toHaveLength(2)
    })
  })

  describe('removePhoto', () => {
    it('removes a photo by URI', () => {
      useImportStore.getState().addPhoto('file:///photo1.jpg')
      useImportStore.getState().addPhoto('file:///photo2.jpg')

      useImportStore.getState().removePhoto('file:///photo1.jpg')

      const photos = useImportStore.getState().photos
      expect(photos).toHaveLength(1)
      expect(photos[0]?.uri).toBe('file:///photo2.jpg')
    })
  })

  describe('setMode', () => {
    it('sets mode to add', () => {
      useImportStore.getState().setMode('add')
      expect(useImportStore.getState().mode).toBe('add')
    })

    it('sets mode to replace', () => {
      useImportStore.getState().setMode('add')
      useImportStore.getState().setMode('replace')
      expect(useImportStore.getState().mode).toBe('replace')
    })
  })

  describe('updatePhotoStatus', () => {
    it('updates status of a photo by URI', () => {
      useImportStore.getState().addPhoto('file:///photo1.jpg')

      useImportStore.getState().updatePhotoStatus('file:///photo1.jpg', 'uploading')

      const photos = useImportStore.getState().photos
      expect(photos[0]?.status).toBe('uploading')
    })
  })

  describe('setWorkouts', () => {
    it('sets the extracted workouts array', () => {
      const workouts = [makeExtractedWorkout()]

      useImportStore.getState().setWorkouts(workouts)

      expect(useImportStore.getState().workouts).toEqual(workouts)
    })
  })

  describe('updateExtractedExercise', () => {
    it('updates a specific exercise within a workout', () => {
      const workouts = [makeExtractedWorkout()]
      useImportStore.getState().setWorkouts(workouts)

      useImportStore.getState().updateExtractedExercise(0, 0, { name: 'Updated Name' })

      const updated = useImportStore.getState().workouts[0]?.exercises[0]
      expect(updated?.name).toBe('Updated Name')
    })

    it('does not affect other exercises', () => {
      const workouts = [makeExtractedWorkout()]
      useImportStore.getState().setWorkouts(workouts)

      useImportStore.getState().updateExtractedExercise(0, 0, { name: 'Updated' })

      const other = useImportStore.getState().workouts[0]?.exercises[1]
      expect(other?.name).toBe('Crucifixo')
    })
  })

  describe('setStatus', () => {
    it('sets the status', () => {
      useImportStore.getState().setStatus('processing')
      expect(useImportStore.getState().status).toBe('processing')
    })
  })

  describe('confirmImport', () => {
    it('calls planStore.importPlans with current workouts and mode', () => {
      const workouts = [makeExtractedWorkout()]
      useImportStore.getState().setWorkouts(workouts)
      useImportStore.getState().setMode('replace')

      useImportStore.getState().confirmImport()

      expect(mockImportPlans).toHaveBeenCalledWith(workouts, 'replace')
    })

    it('sets status to confirmed', () => {
      useImportStore.getState().setWorkouts([makeExtractedWorkout()])

      useImportStore.getState().confirmImport()

      expect(useImportStore.getState().status).toBe('confirmed')
    })

    it('captures skippedPlanId from importPlans return', () => {
      const skippedId = 'skipped-plan-id' as PlanId
      mockImportPlans.mockReturnValue({ skippedPlanId: skippedId })

      useImportStore.getState().setWorkouts([makeExtractedWorkout()])
      useImportStore.getState().confirmImport()

      expect(useImportStore.getState().skippedPlanId).toBe(skippedId)
    })

    it('does not set skippedPlanId when none returned', () => {
      mockImportPlans.mockReturnValue({})

      useImportStore.getState().setWorkouts([makeExtractedWorkout()])
      useImportStore.getState().confirmImport()

      expect(useImportStore.getState().skippedPlanId).toBeNull()
    })
  })

  describe('reset', () => {
    it('resets all state including skippedPlanId', () => {
      useImportStore.getState().addPhoto('file:///photo.jpg')
      useImportStore.getState().setWorkouts([makeExtractedWorkout()])
      useImportStore.getState().setMode('add')
      useImportStore.getState().setStatus('reviewing')

      useImportStore.getState().reset()

      const state = useImportStore.getState()
      expect(state.photos).toEqual([])
      expect(state.workouts).toEqual([])
      expect(state.mode).toBe('replace')
      expect(state.status).toBe('idle')
      expect(state.skippedPlanId).toBeNull()
    })
  })
})
