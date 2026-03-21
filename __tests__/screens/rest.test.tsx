/**
 * Rest screen tests — Phase 4 (TDD)
 *
 * Tests timer completion navigation, "Ir para pulados" guard,
 * skip rest button, and next exercise preview.
 */

import { render, screen, fireEvent, act } from '@testing-library/react-native'
import type { ExerciseId, Exercise, Plan, PlanId, SetRecord, ExerciseLog } from '@/types'

// -- Reanimated mock --

jest.mock('react-native-reanimated', () => {
  const React = require('react')
  return {
    __esModule: true,
    useSharedValue: jest.fn((init: number) => ({ value: init })),
    useAnimatedProps: jest.fn((fn: () => Record<string, unknown>) => fn()),
    withTiming: jest.fn((val: number) => val),
    interpolateColor: jest.fn(() => '#C2F000'),
    cancelAnimation: jest.fn(),
    Easing: { linear: 'linear' },
    default: {
      createAnimatedComponent: (component: React.ComponentType) => component,
    },
  }
})

jest.mock('react-native-svg', () => {
  const React = require('react')
  return {
    Svg: (props: Record<string, unknown>) => React.createElement('View', props),
    Circle: (props: Record<string, unknown>) => React.createElement('View', props),
    default: (props: Record<string, unknown>) => React.createElement('View', props),
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

let RestScreen: React.ComponentType

beforeAll(() => {
  RestScreen = require('@/app/(workout)/rest').default
})

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()

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

afterEach(() => {
  jest.useRealTimers()
})

describe('Rest Screen', () => {
  it('renders the rest timer', () => {
    render(<RestScreen />)

    expect(screen.getByText('60')).toBeTruthy()
  })

  it('navigates back when timer completes', () => {
    render(<RestScreen />)

    // Advance timer to completion (60 seconds)
    act(() => {
      jest.advanceTimersByTime(60000)
    })

    expect(mockBack).toHaveBeenCalled()
  })

  it('renders "Pular Descanso" button', () => {
    render(<RestScreen />)

    expect(screen.getByText('Pular Descanso')).toBeTruthy()
  })

  it('navigates back when "Pular Descanso" is pressed', () => {
    render(<RestScreen />)

    fireEvent.press(screen.getByText('Pular Descanso'))

    expect(mockBack).toHaveBeenCalled()
  })

  it('shows "Ir para exercícios pulados" ONLY when skippedIds > 0 AND currentSets empty', () => {
    mockWorkoutState.skippedIds = ['ex-1' as ExerciseId]
    mockWorkoutState.currentSets = [] // Safe to detour

    render(<RestScreen />)

    expect(screen.getByText(/Ir para exercícios pulados/)).toBeTruthy()
  })

  it('hides "Ir para exercícios pulados" when currentSets is NOT empty', () => {
    mockWorkoutState.skippedIds = ['ex-1' as ExerciseId]
    mockWorkoutState.currentSets = [{ weight: 60, completedAt: 1000 }] // Mid-exercise — not safe

    render(<RestScreen />)

    expect(screen.queryByText(/Ir para exercícios pulados/)).toBeNull()
  })

  it('hides "Ir para exercícios pulados" when no skipped exercises', () => {
    mockWorkoutState.skippedIds = []
    mockWorkoutState.currentSets = []

    render(<RestScreen />)

    expect(screen.queryByText(/Ir para exercícios pulados/)).toBeNull()
  })

  it('"Ir para exercícios pulados" navigates to checkpoint with replace', () => {
    mockWorkoutState.skippedIds = ['ex-1' as ExerciseId]
    mockWorkoutState.currentSets = []

    render(<RestScreen />)

    fireEvent.press(screen.getByText(/Ir para exercícios pulados/))

    expect(mockReplace).toHaveBeenCalledWith('/(workout)/checkpoint')
  })

  it('shows next exercise preview', () => {
    // Current exercise should be ex-1 (first non-skipped)
    render(<RestScreen />)

    expect(screen.getByText(/Supino Reto/)).toBeTruthy()
  })
})
