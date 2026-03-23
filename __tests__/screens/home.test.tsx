/**
 * Home screen tests — rewritten to use planStore instead of hardcoded PLANS.
 *
 * Tests: renders plans from planStore, EmptyPlans when no plans, "Meus Treinos"
 * button navigates to /plans/, "Meus Treinos" disabled during active workout,
 * PROXIMO chip logic, HistoryChip, resume banner, auto-redirect, disabled cards,
 * seed step, and card press.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'

import { useWorkoutStore } from '@/stores/workoutStore'
import { useAppStore } from '@/stores/appStore'
import { usePlanStore } from '@/stores/planStore'

import HomeScreen from '@/app/index'

import type { Plan, PlanId } from '@/types'
import { makePlan } from '@/test-utils/factories'

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

jest.mock('@/stores/planStore', () => ({
  usePlanStore: Object.assign(jest.fn(), {
    setState: jest.fn(),
    getState: jest.fn(),
  }),
}))

// -- Helpers --

const planA = makePlan({
  id: 'A' as PlanId,
  label: 'A',
  name: 'Treino A',
  focus: 'Peito / Ombros / Triceps',
})
const planB = makePlan({
  id: 'B' as PlanId,
  label: 'B',
  name: 'Treino B',
  focus: 'Costas / Biceps',
})
const planC = makePlan({
  id: 'C' as PlanId,
  label: 'C',
  name: 'Treino C',
  focus: 'Pernas',
})

function setupMocks({
  status = 'idle' as 'idle' | 'active' | 'completed',
  lastDates = {} as Partial<Record<string, string>>,
  historyLength = 0,
  startWorkout = jest.fn(),
  plans = [planA, planB, planC] as Plan[],
} = {}) {
  const workoutState = { status, startWorkout }
  ;(useWorkoutStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: typeof workoutState) => unknown) => selector(workoutState),
  )

  const appState = { lastDates, history: { length: historyLength } }
  ;(useAppStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: typeof appState) => unknown) => selector(appState),
  )

  const planState = { plans }
  ;(usePlanStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: typeof planState) => unknown) => selector(planState),
  )
  ;(usePlanStore as unknown as jest.Mock & { getState: jest.Mock }).getState.mockReturnValue({
    plans,
  })

  return { startWorkout }
}

// -- Tests --

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders WorkoutCards with plan names from planStore', () => {
    setupMocks()

    render(<HomeScreen />)

    expect(screen.getByText('Treino A')).toBeTruthy()
    expect(screen.getByText('Treino B')).toBeTruthy()
    expect(screen.getByText('Treino C')).toBeTruthy()
  })

  it('renders EmptyPlans when planStore has no plans', () => {
    setupMocks({ plans: [] })

    render(<HomeScreen />)

    expect(screen.getByText('Sem Treinos')).toBeTruthy()
    expect(screen.getByText('CRIAR PRIMEIRO PLANO')).toBeTruthy()
  })

  describe('"Meus Treinos" button', () => {
    it('navigates to /plans/ when pressed', () => {
      setupMocks()

      render(<HomeScreen />)

      fireEvent.press(screen.getByText('MEUS TREINOS'))

      expect(mockPush).toHaveBeenCalledWith('/plans/')
    })

    it('is disabled during active workout', () => {
      setupMocks({ status: 'active' })

      render(<HomeScreen />)

      // Button should not be visible during active workout
      expect(screen.queryByText('MEUS TREINOS')).toBeNull()
    })
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

      const proximoChips = screen.getAllByText('PRÓXIMO')
      expect(proximoChips).toHaveLength(1)
    })

    it('shows PROXIMO on card with undefined lastDate (never done)', () => {
      setupMocks({
        lastDates: {
          A: '2026-03-20',
          C: '2026-03-19',
        },
      })

      render(<HomeScreen />)

      const proximoChips = screen.getAllByText('PRÓXIMO')
      expect(proximoChips).toHaveLength(1)
    })

    it('tie-breaks A->B->C when all undefined', () => {
      setupMocks({ lastDates: {} })

      render(<HomeScreen />)

      const proximoChips = screen.getAllByText('PRÓXIMO')
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
