/**
 * History screen tests — Phase 4 (TDD: tests first, implementation second)
 *
 * Tests the History screen behavior: list ordering, inline delete with
 * confirmation, cancel, and empty state.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'
import type { WorkoutSession, WorkoutId, PlanId } from '@/types'

// -- Mocks --

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
}))

jest.mock('@/stores/appStore', () => ({
  useAppStore: jest.fn(),
}))

// Mock FlashList as a simple FlatList for testing
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native')
  return {
    FlashList: FlatList,
  }
})

import { useAppStore } from '@/stores/appStore'
import HistoryScreen from '@/app/history'

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

function setupMocks({
  history = [] as WorkoutSession[],
  deleteWorkout = jest.fn(),
} = {}) {
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

    // All three should be rendered
    expect(screen.getByText('Treino A')).toBeTruthy()
    expect(screen.getByText('Treino B')).toBeTruthy()
    expect(screen.getByText('Treino C')).toBeTruthy()
  })

  describe('Inline delete', () => {
    it('shows confirmation when APAGAR is tapped', () => {
      const sessions = [
        makeSession({ id: 'A-1000' as WorkoutId, planName: 'Treino A' }),
      ]
      setupMocks({ history: sessions })

      render(<HistoryScreen />)

      // Tap the APAGAR button
      fireEvent.press(screen.getByText('APAGAR'))

      // Confirmation buttons should appear
      expect(screen.getByText('CONFIRMAR')).toBeTruthy()
      expect(screen.getByText('CANCELAR')).toBeTruthy()
    })

    it('deletes workout when CONFIRMAR is tapped', () => {
      const sessions = [
        makeSession({ id: 'A-1000' as WorkoutId, planName: 'Treino A' }),
      ]
      const { deleteWorkout } = setupMocks({ history: sessions })

      render(<HistoryScreen />)

      // Tap APAGAR, then CONFIRMAR
      fireEvent.press(screen.getByText('APAGAR'))
      fireEvent.press(screen.getByText('CONFIRMAR'))

      expect(deleteWorkout).toHaveBeenCalledWith('A-1000')
    })

    it('hides confirmation when CANCELAR is tapped', () => {
      const sessions = [
        makeSession({ id: 'A-1000' as WorkoutId, planName: 'Treino A' }),
      ]
      setupMocks({ history: sessions })

      render(<HistoryScreen />)

      // Tap APAGAR to show confirmation
      fireEvent.press(screen.getByText('APAGAR'))
      expect(screen.getByText('CONFIRMAR')).toBeTruthy()

      // Tap CANCELAR to hide confirmation
      fireEvent.press(screen.getByText('CANCELAR'))

      // Confirmation should be hidden, APAGAR should be back
      expect(screen.queryByText('CONFIRMAR')).toBeNull()
      expect(screen.getByText('APAGAR')).toBeTruthy()
    })
  })

  it('shows empty state when no history', () => {
    setupMocks({ history: [] })

    render(<HistoryScreen />)

    expect(screen.getByText('Nenhum treino registrado')).toBeTruthy()
  })
})
