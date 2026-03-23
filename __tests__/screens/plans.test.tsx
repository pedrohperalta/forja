/**
 * Plans list screen tests
 *
 * Tests rendering of plans from planStore, add plan button,
 * empty state, and delete plan flow.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'

import { usePlanStore } from '@/stores/planStore'
import PlansScreen from '@/app/plans/index'
import type { Plan, PlanId, ExerciseId } from '@/types'

// -- Mocks --

const mockPush = jest.fn()
const mockBack = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}))

jest.mock('@/stores/planStore', () => ({
  usePlanStore: jest.fn(),
}))

// -- Helpers --

const makePlan = (overrides: Partial<Plan> = {}): Plan => ({
  id: 'plan-1' as PlanId,
  label: 'A',
  name: 'Treino A',
  focus: 'Peito / Ombros / Triceps',
  exercises: [
    {
      id: 'ex-1' as ExerciseId,
      name: 'Supino Reto',
      category: 'Peito',
      equipment: 'Maquina',
      reps: '10-12',
      sets: 3,
      restSeconds: 60,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

function setupMocks({
  plans = [] as Plan[],
  addPlan = jest.fn().mockReturnValue('new-plan-id'),
  removePlan = jest.fn(),
} = {}) {
  const state = { plans, addPlan, removePlan }
  ;(usePlanStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: typeof state) => unknown) => selector(state),
  )
  return { addPlan, removePlan }
}

// -- Tests --

describe('PlansScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders plan cards from store', () => {
    const plans = [
      makePlan({ id: 'p1' as PlanId, label: 'A', name: 'Treino A' }),
      makePlan({ id: 'p2' as PlanId, label: 'B', name: 'Treino B', focus: 'Costas / Biceps' }),
    ]
    setupMocks({ plans })

    render(<PlansScreen />)

    expect(screen.getByText('Treino A')).toBeTruthy()
    expect(screen.getByText('Treino B')).toBeTruthy()
  })

  it('renders empty state when no plans exist', () => {
    setupMocks({ plans: [] })

    render(<PlansScreen />)

    expect(screen.getByText(/nenhum plano/i)).toBeTruthy()
  })

  it('renders add plan button', () => {
    setupMocks()

    render(<PlansScreen />)

    expect(screen.getByText('NOVO PLANO')).toBeTruthy()
  })

  it('adds a plan and navigates when NOVO PLANO is pressed', () => {
    const { addPlan } = setupMocks()
    addPlan.mockReturnValue('new-id')

    render(<PlansScreen />)

    fireEvent.press(screen.getByText('NOVO PLANO'))

    expect(addPlan).toHaveBeenCalledWith('', '')
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/plans/[id]', params: { id: 'new-id' } })
  })

  it('navigates to plan detail when plan card is pressed', () => {
    const plans = [makePlan({ id: 'p1' as PlanId, name: 'Treino A' })]
    setupMocks({ plans })

    render(<PlansScreen />)

    fireEvent.press(screen.getByLabelText('Treino A, Peito / Ombros / Triceps'))

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/plans/[id]', params: { id: 'p1' } })
  })

  it('calls removePlan after two-step delete', () => {
    const plans = [makePlan({ id: 'p1' as PlanId, name: 'Treino A' })]
    const { removePlan } = setupMocks({ plans })

    render(<PlansScreen />)

    fireEvent.press(screen.getByText('APAGAR'))
    fireEvent.press(screen.getByText('CONFIRMAR'))

    expect(removePlan).toHaveBeenCalledWith('p1')
  })

  it('renders back navigation chevron bar', () => {
    setupMocks()

    render(<PlansScreen />)

    expect(screen.getByText('TREINOS')).toBeTruthy()
  })

  it('renders screen title', () => {
    setupMocks()

    render(<PlansScreen />)

    expect(screen.getByText('MEUS PLANOS')).toBeTruthy()
  })
})
