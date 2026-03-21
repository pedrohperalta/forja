/**
 * Checkpoint screen tests — Phase 5 (TDD)
 *
 * Tests display of skipped exercises, FAZER AGORA, NAO VOU FAZER,
 * and empty queue redirect guard.
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

jest.mock('@/stores/workoutStore', () => ({
  useWorkoutStore: (selector: (state: typeof mockWorkoutState) => unknown) =>
    selector(mockWorkoutState),
}))

// Mock FlashList to render as a simple list
jest.mock('@shopify/flash-list', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    FlashList: ({ data, renderItem }: { data: unknown[]; renderItem: (info: { item: unknown; index: number }) => React.JSX.Element }) => {
      return React.createElement(
        View,
        null,
        data.map((item: unknown, index: number) =>
          React.createElement(
            React.Fragment,
            { key: index },
            renderItem({ item, index }),
          ),
        ),
      )
    },
  }
})

const mockReplace = jest.fn()
const mockPush = jest.fn()
const mockBack = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  }),
}))

// -- Test data factories --

function makeExercise(id: string, name?: string): Exercise {
  return {
    id: id as ExerciseId,
    name: name ?? `Exercise ${id}`,
    category: 'TEST',
    equipment: 'Machine',
    reps: '10-15',
    sets: 3,
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

// -- Import screen after mocks --

let CheckpointScreen: React.ComponentType

beforeAll(() => {
  CheckpointScreen = require('@/app/(workout)/checkpoint').default
})

beforeEach(() => {
  jest.clearAllMocks()

  const exercises = [
    makeExercise('ex-1', 'Supino Reto'),
    makeExercise('ex-2', 'Crucifixo'),
    makeExercise('ex-3', 'Elevacao Lateral'),
  ]

  mockWorkoutState.status = 'active'
  mockWorkoutState.activePlan = makePlan(exercises)
  mockWorkoutState.queue = [...exercises]
  mockWorkoutState.skippedIds = ['ex-1' as ExerciseId, 'ex-2' as ExerciseId]
  mockWorkoutState.currentSet = 1
  mockWorkoutState.currentSets = []
  mockWorkoutState.log = []
  mockWorkoutState.startedAt = 1000
  mockWorkoutState.completedAt = null
})

describe('Checkpoint Screen', () => {
  it('shows only skipped exercises from queue', () => {
    render(<CheckpointScreen />)

    // ex-1 and ex-2 are skipped, should show
    expect(screen.getByText('Supino Reto')).toBeTruthy()
    expect(screen.getByText('Crucifixo')).toBeTruthy()

    // ex-3 is NOT skipped, should not show
    expect(screen.queryByText('Elevacao Lateral')).toBeNull()
  })

  it('calls returnToSkipped and navigates to exercise on "FAZER AGORA"', () => {
    render(<CheckpointScreen />)

    // Press FAZER AGORA on first skipped exercise
    const doNowButtons = screen.getAllByText('FAZER AGORA')
    fireEvent.press(doNowButtons[0]!)

    expect(mockWorkoutState.returnToSkipped).toHaveBeenCalledWith('ex-1')
    expect(mockReplace).toHaveBeenCalledWith('/(workout)/exercise')
  })

  it('calls removeExercise and navigates per target on "NÃO VOU FAZER" → next', () => {
    mockWorkoutState.removeExercise.mockReturnValue({ target: 'next' })

    render(<CheckpointScreen />)

    const removeButtons = screen.getAllByText('NÃO VOU FAZER')
    fireEvent.press(removeButtons[0]!)

    expect(mockWorkoutState.removeExercise).toHaveBeenCalledWith('ex-1')
    expect(mockReplace).toHaveBeenCalledWith('/(workout)/exercise')
  })

  it('stays on checkpoint when removeExercise returns target=checkpoint', () => {
    mockWorkoutState.removeExercise.mockReturnValue({ target: 'checkpoint' })

    render(<CheckpointScreen />)

    const removeButtons = screen.getAllByText('NÃO VOU FAZER')
    fireEvent.press(removeButtons[0]!)

    expect(mockWorkoutState.removeExercise).toHaveBeenCalledWith('ex-1')
    // Should NOT navigate — re-render shows fewer cards
    expect(mockReplace).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('navigates to complete when removeExercise returns target=complete', () => {
    mockWorkoutState.removeExercise.mockReturnValue({ target: 'complete' })

    render(<CheckpointScreen />)

    const removeButtons = screen.getAllByText('NÃO VOU FAZER')
    fireEvent.press(removeButtons[0]!)

    expect(mockReplace).toHaveBeenCalledWith('/(workout)/complete')
  })

  it('redirects to complete when queue is empty on mount', () => {
    mockWorkoutState.queue = []
    mockWorkoutState.skippedIds = []

    render(<CheckpointScreen />)

    expect(mockReplace).toHaveBeenCalledWith('/(workout)/complete')
  })
})
