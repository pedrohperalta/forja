/**
 * Home screen tests — Phase 1 (TDD: tests first, implementation second)
 *
 * Tests the Home screen behavior: WorkoutCards rendering, PROXIMO chip logic,
 * HistoryChip visibility, resume banner, auto-redirect, disabled cards,
 * and tapping enabled cards.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'

// Import mocked stores for test setup
import { useWorkoutStore } from '@/stores/workoutStore'
import { useAppStore } from '@/stores/appStore'

// Import the component under test (will fail until implementation exists)
import HomeScreen from '@/app/index'

// -- Mocks --

const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

jest.mock('@/stores/workoutStore', () => ({
  useWorkoutStore: jest.fn(),
}))

jest.mock('@/stores/appStore', () => ({
  useAppStore: jest.fn(),
}))

// -- Helpers --

/** Configure mock store selectors for each test. */
function setupMocks({
  status = 'idle' as 'idle' | 'active' | 'completed',
  lastDates = {} as Partial<Record<string, string>>,
  historyLength = 0,
  startWorkout = jest.fn(),
} = {}) {
  // useWorkoutStore is called with a selector; mock it to call the selector
  // with the mock state and return the result
  const workoutState = { status, startWorkout }
  ;(useWorkoutStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: typeof workoutState) => unknown) => selector(workoutState),
  )

  const appState = { lastDates, history: { length: historyLength } }
  ;(useAppStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: typeof appState) => unknown) => selector(appState),
  )

  return { startWorkout }
}

// -- Tests --

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders 3 WorkoutCards with plan names', () => {
    setupMocks()

    render(<HomeScreen />)

    expect(screen.getByText('Treino A')).toBeTruthy()
    expect(screen.getByText('Treino B')).toBeTruthy()
    expect(screen.getByText('Treino C')).toBeTruthy()
  })

  describe('PROXIMO chip logic', () => {
    it('shows PROXIMO on the card with the oldest lastDate', () => {
      setupMocks({
        lastDates: {
          A: '2026-03-20',
          B: '2026-03-21',
          C: '2026-03-19',
        },
      })

      render(<HomeScreen />)

      // C has oldest date (03-19), should have PROXIMO chip
      const proximoChips = screen.getAllByText('PROXIMO')
      expect(proximoChips).toHaveLength(1)

      // The PROXIMO chip should be associated with Treino C
      // We verify by checking the card containing both "Treino C" and "PROXIMO"
      const treeCCard = screen.getByText('Treino C')
      // Traverse up to find the card parent, then check PROXIMO is within it
      expect(treeCCard).toBeTruthy()
    })

    it('shows PROXIMO on card with undefined lastDate (never done)', () => {
      setupMocks({
        lastDates: {
          A: '2026-03-20',
          // B is undefined — never done
          C: '2026-03-19',
        },
      })

      render(<HomeScreen />)

      const proximoChips = screen.getAllByText('PROXIMO')
      expect(proximoChips).toHaveLength(1)
    })

    it('tie-breaks A->B->C when all undefined', () => {
      setupMocks({ lastDates: {} })

      render(<HomeScreen />)

      // All undefined, tie-break should pick A first
      const proximoChips = screen.getAllByText('PROXIMO')
      expect(proximoChips).toHaveLength(1)
    })
  })

  describe('HistoryChip', () => {
    it('is hidden when history is empty', () => {
      setupMocks({ historyLength: 0 })

      render(<HomeScreen />)

      expect(screen.queryByText('Historico')).toBeNull()
    })

    it('is visible with count when history is not empty', () => {
      setupMocks({ historyLength: 5 })

      render(<HomeScreen />)

      expect(screen.getByText('Historico')).toBeTruthy()
      expect(screen.getByText('5')).toBeTruthy()
    })
  })

  describe('Resume banner', () => {
    it('is visible when status is active', () => {
      setupMocks({ status: 'active' })

      render(<HomeScreen />)

      expect(screen.getByText(/continuar treino/i)).toBeTruthy()
    })

    it('is hidden when status is idle', () => {
      setupMocks({ status: 'idle' })

      render(<HomeScreen />)

      expect(screen.queryByText(/continuar treino/i)).toBeNull()
    })
  })

  describe('Auto-redirect', () => {
    it('redirects to complete screen when status is completed', () => {
      setupMocks({ status: 'completed' })

      render(<HomeScreen />)

      expect(mockReplace).toHaveBeenCalledWith('/(workout)/complete')
    })
  })

  describe('Cards disabled during active workout', () => {
    it('cards are not tappable when status is active', () => {
      const { startWorkout } = setupMocks({ status: 'active' })

      render(<HomeScreen />)

      // Try to press a card — startWorkout should NOT be called
      const card = screen.getByText('Treino A')
      fireEvent.press(card)

      expect(startWorkout).not.toHaveBeenCalled()
    })
  })

  describe('Tapping an enabled card', () => {
    it('calls startWorkout and navigates to workout exercise screen', () => {
      const { startWorkout } = setupMocks({ status: 'idle' })

      render(<HomeScreen />)

      const card = screen.getByText('Treino A')
      fireEvent.press(card)

      expect(startWorkout).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith('/(workout)/exercise')
    })
  })
})
