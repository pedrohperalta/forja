/**
 * Exercise screen tests — Phase 2 (TDD: tests first, implementation second)
 *
 * Tests the exercise screen's rendering, weight pre-fill logic,
 * skip/remove button visibility, navigation routing, guards,
 * and double-tap protection.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'
import type { ExerciseId, Exercise, Plan, PlanId, SetRecord, ExerciseLog } from '@/types'

// -- Mock stores --

const mockWorkoutState = {
  status: 'active' as 'idle' | 'active' | 'completed',
  activePlan: null as Plan | null,
  queue: [] as Exercise[],
  skippedIds: [] as ExerciseId[],
  currentSet: 1,
  currentSets: [] as SetRecord[],
  log: [] as ExerciseLog[],
  startedAt: 1000,
  completedAt: null as number | null,
  completeSet: jest.fn(),
  skipExercise: jest.fn(),
  removeExercise: jest.fn(),
  returnToSkipped: jest.fn(),
  complete: jest.fn(),
  reset: jest.fn(),
  startWorkout: jest.fn(),
}

const mockAppState = {
  lastWeights: {} as Record<string, number>,
  lastDates: {},
  history: [],
  saveWorkout: jest.fn(),
  updateLastWeights: jest.fn(),
  deleteWorkout: jest.fn(),
}

jest.mock('@/stores/workoutStore', () => ({
  useWorkoutStore: (selector: (state: typeof mockWorkoutState) => unknown) =>
    selector(mockWorkoutState),
}))

jest.mock('@/stores/appStore', () => ({
  useAppStore: (selector: (state: typeof mockAppState) => unknown) => selector(mockAppState),
}))

const mockReplace = jest.fn()
const mockPush = jest.fn()
const mockBack = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  }),
  useFocusEffect: (cb: () => void) => cb(),
}))

// -- Test data factories --

function makeExercise(id: string, name?: string, sets = 3): Exercise {
  return {
    id: id as ExerciseId,
    name: name ?? `Exercise ${id}`,
    category: 'TEST',
    equipment: 'Machine',
    reps: '10-15',
    sets,
  }
}

function makePlan(exercises: Exercise[]): Plan {
  return {
    id: 'A' as PlanId,
    name: 'Treino A',
    focus: 'Peito / Ombros / Triceps',
    exercises,
  }
}

// -- Import the screen component (after mocks) --

let ExerciseScreen: React.ComponentType

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ExerciseScreen = require('@/app/(workout)/exercise').default
})

// -- Reset mocks between tests --

beforeEach(() => {
  jest.clearAllMocks()

  // Reset to default active state
  const exercises = [
    makeExercise('ex-1', 'Supino Reto'),
    makeExercise('ex-2', 'Crucifixo'),
    makeExercise('ex-3', 'Elevacao Lateral'),
  ]

  mockWorkoutState.status = 'active'
  mockWorkoutState.activePlan = makePlan(exercises)
  mockWorkoutState.queue = [...exercises]
  mockWorkoutState.skippedIds = []
  mockWorkoutState.currentSet = 1
  mockWorkoutState.currentSets = []
  mockWorkoutState.log = []
  mockWorkoutState.startedAt = 1000
  mockWorkoutState.completedAt = null

  mockAppState.lastWeights = {}
})

describe('Exercise Screen', () => {
  describe('rendering', () => {
    it('shows current exercise name via getCurrentExercise (not queue[0])', () => {
      // Skip ex-1, so current exercise should be ex-2
      mockWorkoutState.skippedIds = ['ex-1' as ExerciseId]

      render(<ExerciseScreen />)

      expect(screen.getByText('Crucifixo')).toBeTruthy()
    })

    it('shows first non-skipped exercise, not queue[0]', () => {
      // No skips — should show ex-1
      render(<ExerciseScreen />)

      expect(screen.getByText('Supino Reto')).toBeTruthy()
    })
  })

  describe('weight pre-fill', () => {
    it('pre-fills from currentSets (between sets)', () => {
      mockWorkoutState.currentSet = 2
      mockWorkoutState.currentSets = [{ weight: 65, completedAt: 1000 }]

      render(<ExerciseScreen />)

      const input = screen.getByLabelText('Peso para Supino Reto, série 2')
      expect(input.props.value).toBe('65')
    })

    it('pre-fills from lastWeights for new exercise (no currentSets)', () => {
      mockAppState.lastWeights = { 'ex-1': 70 }

      render(<ExerciseScreen />)

      const input = screen.getByLabelText('Peso para Supino Reto, série 1')
      expect(input.props.value).toBe('70')
    })

    it('defaults to empty when no lastWeights and no currentSets', () => {
      render(<ExerciseScreen />)

      const input = screen.getByLabelText('Peso para Supino Reto, série 1')
      expect(input.props.value).toBe('')
    })
  })

  describe('skip/remove buttons', () => {
    it('shows "Pular" and "Não vou fazer" on set 1', () => {
      mockWorkoutState.currentSet = 1

      render(<ExerciseScreen />)

      expect(screen.getByText('Pular')).toBeTruthy()
      expect(screen.getByText('Não vou fazer')).toBeTruthy()
    })

    it('hides "Pular" and "Não vou fazer" on set 2+', () => {
      mockWorkoutState.currentSet = 2
      mockWorkoutState.currentSets = [{ weight: 60, completedAt: 1000 }]

      render(<ExerciseScreen />)

      expect(screen.queryByText('Pular')).toBeNull()
      expect(screen.queryByText('Não vou fazer')).toBeNull()
    })
  })

  describe('completeSet navigation', () => {
    it('navigates to rest on target=rest', () => {
      mockWorkoutState.completeSet.mockReturnValue({ target: 'rest' })

      render(<ExerciseScreen />)

      // Enter weight first
      const input = screen.getByLabelText('Peso para Supino Reto, série 1')
      fireEvent.changeText(input, '60')

      // Tap complete button
      fireEvent.press(screen.getByText('COMPLETEI A SÉRIE'))

      expect(mockWorkoutState.completeSet).toHaveBeenCalledWith(60)
      expect(mockPush).toHaveBeenCalledWith('/(workout)/rest')
    })

    it('navigates to checkpoint on target=checkpoint', () => {
      mockWorkoutState.completeSet.mockReturnValue({ target: 'checkpoint' })

      render(<ExerciseScreen />)

      const input = screen.getByLabelText('Peso para Supino Reto, série 1')
      fireEvent.changeText(input, '50')
      fireEvent.press(screen.getByText('COMPLETEI A SÉRIE'))

      expect(mockPush).toHaveBeenCalledWith('/(workout)/checkpoint')
    })

    it('navigates to complete on target=complete', () => {
      mockWorkoutState.completeSet.mockReturnValue({ target: 'complete' })

      render(<ExerciseScreen />)

      const input = screen.getByLabelText('Peso para Supino Reto, série 1')
      fireEvent.changeText(input, '50')
      fireEvent.press(screen.getByText('COMPLETEI A SÉRIE'))

      expect(mockReplace).toHaveBeenCalledWith('/(workout)/complete')
    })

    it('does not navigate on target=next (re-render)', () => {
      mockWorkoutState.completeSet.mockReturnValue({ target: 'next' })

      render(<ExerciseScreen />)

      const input = screen.getByLabelText('Peso para Supino Reto, série 1')
      fireEvent.changeText(input, '50')
      fireEvent.press(screen.getByText('COMPLETEI A SÉRIE'))

      expect(mockPush).not.toHaveBeenCalled()
      expect(mockReplace).not.toHaveBeenCalled()
    })
  })

  describe('guards', () => {
    it('redirects to complete when status=completed', () => {
      mockWorkoutState.status = 'completed'

      render(<ExerciseScreen />)

      expect(mockReplace).toHaveBeenCalledWith('/(workout)/complete')
    })

    it('redirects to checkpoint when no current exercise, log has entries, and skipped remain', () => {
      // All exercises in queue are skipped, but we have log entries
      // Should go to checkpoint so user can handle skipped exercises
      mockWorkoutState.skippedIds = [
        'ex-1' as ExerciseId,
        'ex-2' as ExerciseId,
        'ex-3' as ExerciseId,
      ]
      mockWorkoutState.log = [
        {
          exerciseId: 'ex-0' as ExerciseId,
          name: 'Completed Exercise',
          sets: [{ weight: 50, completedAt: 1000 }],
        },
      ]

      render(<ExerciseScreen />)

      expect(mockReplace).toHaveBeenCalledWith('/(workout)/checkpoint')
    })

    it('redirects to checkpoint when all skipped, empty log, queue > 0', () => {
      mockWorkoutState.skippedIds = [
        'ex-1' as ExerciseId,
        'ex-2' as ExerciseId,
        'ex-3' as ExerciseId,
      ]
      mockWorkoutState.log = []

      render(<ExerciseScreen />)

      expect(mockReplace).toHaveBeenCalledWith('/(workout)/checkpoint')
    })
  })

  describe('double-tap protection', () => {
    it('disables confirm button after first tap', () => {
      mockWorkoutState.completeSet.mockReturnValue({ target: 'rest' })

      render(<ExerciseScreen />)

      const input = screen.getByLabelText('Peso para Supino Reto, série 1')
      fireEvent.changeText(input, '60')

      const button = screen.getByText('COMPLETEI A SÉRIE')

      // First tap
      fireEvent.press(button)
      expect(mockWorkoutState.completeSet).toHaveBeenCalledTimes(1)

      // Second tap should be blocked
      fireEvent.press(button)
      expect(mockWorkoutState.completeSet).toHaveBeenCalledTimes(1)
    })
  })
})
