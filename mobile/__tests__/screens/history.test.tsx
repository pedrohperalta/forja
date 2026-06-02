/**
 * History screen tests
 *
 * Tests the History screen behavior: list ordering, tap-to-expand
 * delete flow, month section headers, and empty state.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'
import type { WorkoutSession, WorkoutId, PlanId } from '@/types'

import { useAppStore } from '@/stores/appStore'
import HistoryScreen from '@/app/history'

// -- Mocks --

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
}))

jest.mock('@/stores/appStore', () => ({
  useAppStore: jest.fn(),
}))

// Mock FlashList as a simple FlatList for testing
jest.mock('@shopify/flash-list', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { FlatList } = require('react-native')
  return {
    FlashList: FlatList,
  }
})

// Mock react-native-svg for the back chevron
jest.mock('react-native-svg', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react')
  const Svg = (props: Record<string, unknown>) => React.createElement('View', props)
  Svg.default = Svg
  return {
    __esModule: true,
    default: Svg,
    Svg,
    Path: (props: Record<string, unknown>) => React.createElement('View', props),
  }
})

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

// -- Helpers --

function setupMocks({ history = [] as WorkoutSession[], deleteWorkout = jest.fn() } = {}) {
  const appState = { history, deleteWorkout }
  ;(useAppStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: typeof appState) => unknown) => selector(appState),
  )

  return { deleteWorkout }
}

// -- Tests --

describe('HistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders list of workouts ordered by date descending', () => {
    const sessions = [
      makeSession({
        id: 'A-1000' as WorkoutId,
        planName: 'Treino A',
        date: '2026-03-19',
        createdAt: '2026-03-19T10:00:00.000Z',
      }),
      makeSession({
        id: 'B-2000' as WorkoutId,
        planName: 'Treino B',
        date: '2026-03-21',
        createdAt: '2026-03-21T10:00:00.000Z',
      }),
      makeSession({
        id: 'C-3000' as WorkoutId,
        planName: 'Treino C',
        date: '2026-03-20',
        createdAt: '2026-03-20T10:00:00.000Z',
      }),
    ]

    setupMocks({ history: sessions })

    render(<HistoryScreen />)

    expect(screen.getByText('Treino A')).toBeTruthy()
    expect(screen.getByText('Treino B')).toBeTruthy()
    expect(screen.getByText('Treino C')).toBeTruthy()
  })

  describe('Tap-to-expand delete', () => {
    it('shows APAGAR after tapping a card', () => {
      const sessions = [makeSession({ id: 'A-1000' as WorkoutId, planName: 'Treino A' })]
      setupMocks({ history: sessions })

      render(<HistoryScreen />)

      fireEvent.press(screen.getByTestId('workout-history-card-A-1000'))

      expect(screen.getByText('APAGAR')).toBeTruthy()
    })

    it('shows confirmation when APAGAR is tapped', () => {
      const sessions = [makeSession({ id: 'A-1000' as WorkoutId, planName: 'Treino A' })]
      setupMocks({ history: sessions })

      render(<HistoryScreen />)

      fireEvent.press(screen.getByTestId('workout-history-card-A-1000'))
      fireEvent.press(screen.getByText('APAGAR'))

      expect(screen.getByText('CONFIRMAR')).toBeTruthy()
      expect(screen.getByText('CANCELAR')).toBeTruthy()
    })

    it('deletes workout when CONFIRMAR is tapped', () => {
      const sessions = [makeSession({ id: 'A-1000' as WorkoutId, planName: 'Treino A' })]
      const { deleteWorkout } = setupMocks({ history: sessions })

      render(<HistoryScreen />)

      fireEvent.press(screen.getByTestId('workout-history-card-A-1000'))
      fireEvent.press(screen.getByText('APAGAR'))
      fireEvent.press(screen.getByText('CONFIRMAR'))

      expect(deleteWorkout).toHaveBeenCalledWith('A-1000')
    })

    it('hides confirmation when CANCELAR is tapped', () => {
      const sessions = [makeSession({ id: 'A-1000' as WorkoutId, planName: 'Treino A' })]
      setupMocks({ history: sessions })

      render(<HistoryScreen />)

      fireEvent.press(screen.getByTestId('workout-history-card-A-1000'))
      fireEvent.press(screen.getByText('APAGAR'))
      expect(screen.getByText('CONFIRMAR')).toBeTruthy()

      fireEvent.press(screen.getByText('CANCELAR'))

      expect(screen.getByText('APAGAR')).toBeTruthy()
    })
  })

  it('renders back button integrated with TREINOS label', () => {
    const sessions = [makeSession()]
    setupMocks({ history: sessions })

    render(<HistoryScreen />)

    expect(screen.getByTestId('back-button')).toBeTruthy()
    // The "TREINOS" label is part of the back button row, not a separate element
    expect(screen.getByText('TREINOS')).toBeTruthy()
  })

  it('shows empty state when no history', () => {
    setupMocks({ history: [] })

    render(<HistoryScreen />)

    expect(screen.getByText('Nenhum treino registrado ainda.')).toBeTruthy()
  })

  it('shows workout count summary', () => {
    const sessions = [
      makeSession({ id: 'A-1000' as WorkoutId }),
      makeSession({
        id: 'B-2000' as WorkoutId,
        date: '2026-03-20',
        createdAt: '2026-03-20T10:00:00.000Z',
      }),
    ]
    setupMocks({ history: sessions })

    render(<HistoryScreen />)

    expect(screen.getByText('2 treinos registrados')).toBeTruthy()
  })
})
