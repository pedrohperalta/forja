/**
 * Complete screen tests — Phase 6 (TDD)
 *
 * Tests status-based save, idempotent behavior, empty log handling,
 * stats display, and reset navigation.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'
import type {
  ExerciseId,
  Exercise,
  Plan,
  PlanId,
  SetRecord,
  ExerciseLog,
  WorkoutSession,
} from '@/types'
import { makeExercise, makePlan, makeLog } from '@/test-utils/factories'

// -- Mock FlashList --

jest.mock('@shopify/flash-list', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    FlashList: ({
      data,
      renderItem,
    }: {
      data: unknown[]
      renderItem: (info: { item: unknown; index: number }) => React.JSX.Element
    }) => {
      return React.createElement(
        View,
        null,
        data.map((item: unknown, index: number) =>
          React.createElement(React.Fragment, { key: index }, renderItem({ item, index })),
        ),
      )
    },
  }
})

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
  history: [] as WorkoutSession[],
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
}))

// Factories imported from @/test-utils/factories

function makeTestLog(): ExerciseLog[] {
  return [
    makeLog('ex-1', 'Supino Reto', [
      { weight: 60, completedAt: 2000 },
      { weight: 60, completedAt: 3000 },
      { weight: 65, completedAt: 4000 },
    ]),
    makeLog('ex-2', 'Crucifixo', [
      { weight: 20, completedAt: 5000 },
      { weight: 22, completedAt: 6000 },
      { weight: 22, completedAt: 7000 },
    ]),
  ]
}

// -- Import screen after mocks --

let CompleteScreen: React.ComponentType

beforeAll(() => {
  CompleteScreen = require('@/app/(workout)/complete').default
})

beforeEach(() => {
  jest.clearAllMocks()

  const exercises = [
    makeExercise('ex-1', { name: 'Supino Reto' }),
    makeExercise('ex-2', { name: 'Crucifixo' }),
    makeExercise('ex-3', { name: 'Elevacao Lateral' }),
  ]

  mockWorkoutState.status = 'active'
  mockWorkoutState.activePlan = makePlan({ exercises })
  mockWorkoutState.queue = []
  mockWorkoutState.skippedIds = []
  mockWorkoutState.currentSet = 1
  mockWorkoutState.currentSets = []
  mockWorkoutState.log = makeTestLog()
  mockWorkoutState.startedAt = 1000
  mockWorkoutState.completedAt = null

  mockAppState.lastWeights = {}
  mockAppState.history = []
})

describe('Complete Screen', () => {
  describe('status=active with log', () => {
    it('calls complete(), saveWorkout(), and updateLastWeights()', () => {
      render(<CompleteScreen />)

      expect(mockWorkoutState.complete).toHaveBeenCalled()
      expect(mockAppState.saveWorkout).toHaveBeenCalled()
      expect(mockAppState.updateLastWeights).toHaveBeenCalled()
    })

    it('shows stats: exercise count and total sets', () => {
      render(<CompleteScreen />)

      // 2 exercises completed
      expect(screen.getByText('2')).toBeTruthy()
      // 6 total sets (3 + 3)
      expect(screen.getByText('6')).toBeTruthy()
    })

    it('shows exercise summary list', () => {
      render(<CompleteScreen />)

      expect(screen.getByText('Supino Reto')).toBeTruthy()
      expect(screen.getByText('Crucifixo')).toBeTruthy()
    })
  })

  describe('status=completed (idempotent)', () => {
    it('saves workout and updates weights without calling complete() again', () => {
      mockWorkoutState.status = 'completed'
      mockWorkoutState.completedAt = 100000

      render(<CompleteScreen />)

      // complete() should NOT be called again — status is already 'completed'
      expect(mockWorkoutState.complete).not.toHaveBeenCalled()
      // But saveWorkout and updateLastWeights SHOULD be called (idempotent save)
      expect(mockAppState.saveWorkout).toHaveBeenCalled()
      expect(mockAppState.updateLastWeights).toHaveBeenCalled()
    })
  })

  describe('empty log', () => {
    it('shows "Nenhum exercício completado" message', () => {
      mockWorkoutState.log = []

      render(<CompleteScreen />)

      expect(screen.getByText(/Nenhum exercício completado/)).toBeTruthy()
    })

    it('does not call saveWorkout for empty log', () => {
      mockWorkoutState.log = []

      render(<CompleteScreen />)

      expect(mockAppState.saveWorkout).not.toHaveBeenCalled()
    })
  })

  describe('reset navigation', () => {
    it('"VOLTAR AO INÍCIO" calls reset() and navigates to home', () => {
      render(<CompleteScreen />)

      fireEvent.press(screen.getByText('VOLTAR AO INÍCIO'))

      expect(mockWorkoutState.reset).toHaveBeenCalled()
      expect(mockReplace).toHaveBeenCalledWith('/')
    })
  })

  describe('idempotent save', () => {
    it('useRef(hasSaved) prevents double save on re-render', () => {
      const { rerender } = render(<CompleteScreen />)

      expect(mockAppState.saveWorkout).toHaveBeenCalledTimes(1)

      // Re-render should NOT trigger another save
      rerender(<CompleteScreen />)

      expect(mockAppState.saveWorkout).toHaveBeenCalledTimes(1)
    })
  })
})
