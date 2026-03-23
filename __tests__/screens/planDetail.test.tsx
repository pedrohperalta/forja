/**
 * Plan detail screen tests
 *
 * Tests rendering plan info, exercise list, add exercise navigation,
 * edit exercise navigation, delete exercise, reorder exercises,
 * and back navigation.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'

import { usePlanStore } from '@/stores/planStore'
import PlanDetailScreen from '@/app/plans/[id]/index'
import type { Plan, PlanId, ExerciseId, Exercise } from '@/types'

// -- Mocks --

const mockPush = jest.fn()
const mockBack = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => ({ id: 'plan-1' }),
}))

jest.mock('@/stores/planStore', () => ({
  usePlanStore: jest.fn(),
}))

// Mock react-native-reanimated-dnd — render children directly
jest.mock('react-native-reanimated-dnd', () => ({
  SortableList: ({
    data,
    renderItem,
  }: {
    data: unknown[]
    renderItem: (info: { item: unknown; index: number }) => React.JSX.Element
  }) => {
    const { View } = require('react-native')
    return <View>{data.map((item, index) => renderItem({ item, index }))}</View>
  },
  SortableItem: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native')
    return <View>{children}</View>
  },
}))

// -- Helpers --

const makeExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 'ex-1' as ExerciseId,
  name: 'Supino Reto',
  category: 'Peito',
  equipment: 'Maquina',
  reps: '10-12',
  sets: 3,
  restSeconds: 60,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const makePlan = (overrides: Partial<Plan> = {}): Plan => ({
  id: 'plan-1' as PlanId,
  label: 'A',
  name: 'Treino A',
  focus: 'Peito / Ombros / Triceps',
  exercises: [makeExercise()],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

function setupMocks({
  plan = makePlan(),
  updatePlan = jest.fn(),
  removeExercise = jest.fn(),
  reorderExercises = jest.fn(),
} = {}) {
  const state = {
    plans: plan ? [plan] : [],
    updatePlan,
    removeExercise,
    reorderExercises,
  }
  ;(usePlanStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: typeof state) => unknown) => selector(state),
  )
  return { updatePlan, removeExercise, reorderExercises }
}

// -- Tests --

describe('PlanDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders plan name in editable field', () => {
    setupMocks()

    render(<PlanDetailScreen />)

    expect(screen.getByDisplayValue('Treino A')).toBeTruthy()
  })

  it('renders plan focus in editable field', () => {
    setupMocks()

    render(<PlanDetailScreen />)

    expect(screen.getByDisplayValue('Peito / Ombros / Triceps')).toBeTruthy()
  })

  it('renders exercise list', () => {
    const exercises = [
      makeExercise({ id: 'ex-1' as ExerciseId, name: 'Supino Reto' }),
      makeExercise({ id: 'ex-2' as ExerciseId, name: 'Crucifixo' }),
    ]
    setupMocks({ plan: makePlan({ exercises }) })

    render(<PlanDetailScreen />)

    expect(screen.getByText('Supino Reto')).toBeTruthy()
    expect(screen.getByText('Crucifixo')).toBeTruthy()
  })

  it('renders add exercise button', () => {
    setupMocks()

    render(<PlanDetailScreen />)

    expect(screen.getByText('ADICIONAR EXERCICIO')).toBeTruthy()
  })

  it('navigates to exercise form when add exercise is pressed', () => {
    setupMocks()

    render(<PlanDetailScreen />)

    fireEvent.press(screen.getByText('ADICIONAR EXERCICIO'))

    expect(mockPush).toHaveBeenCalledWith('/plans/plan-1/exercise')
  })

  it('navigates to exercise form in edit mode when edit is pressed', () => {
    setupMocks()

    render(<PlanDetailScreen />)

    fireEvent.press(screen.getByLabelText('Editar exercicio'))

    expect(mockPush).toHaveBeenCalledWith('/plans/plan-1/exercise?exerciseId=ex-1')
  })

  it('calls removeExercise after two-step delete', () => {
    const { removeExercise } = setupMocks()

    render(<PlanDetailScreen />)

    fireEvent.press(screen.getByText('APAGAR'))
    fireEvent.press(screen.getByText('CONFIRMAR'))

    expect(removeExercise).toHaveBeenCalledWith('plan-1', 'ex-1')
  })

  it('renders back navigation chevron bar', () => {
    setupMocks()

    render(<PlanDetailScreen />)

    expect(screen.getByText('PLANOS')).toBeTruthy()
  })

  it('renders empty exercise state', () => {
    setupMocks({ plan: makePlan({ exercises: [] }) })

    render(<PlanDetailScreen />)

    expect(screen.getByText(/nenhum exercicio/i)).toBeTruthy()
  })

  it('renders plan label badge', () => {
    setupMocks()

    render(<PlanDetailScreen />)

    expect(screen.getByText('A')).toBeTruthy()
  })
})
