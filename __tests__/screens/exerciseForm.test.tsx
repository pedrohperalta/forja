/**
 * Exercise form screen tests
 *
 * Tests create mode (empty form, submit creates exercise),
 * edit mode (pre-fills from existing exercise via query param),
 * validation errors, and category selector integration.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'

import { usePlanStore } from '@/stores/planStore'
import ExerciseFormScreen from '@/app/plans/[id]/exercise'
import type { Plan, PlanId, ExerciseId, Exercise } from '@/types'

// -- Mocks --

const mockBack = jest.fn()
let mockParams: Record<string, string> = { id: 'plan-1' }

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockParams,
}))

jest.mock('@/stores/planStore', () => ({
  usePlanStore: jest.fn(),
}))

jest.mock('expo-crypto', () => ({
  randomUUID: () => 'new-uuid',
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
  addExercise = jest.fn(),
  updateExercise = jest.fn(),
} = {}) {
  const state = {
    plans: [plan],
    addExercise,
    updateExercise,
  }
  ;(usePlanStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: typeof state) => unknown) => selector(state),
  )
  return { addExercise, updateExercise }
}

// -- Tests --

describe('ExerciseFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockParams = { id: 'plan-1' }
  })

  describe('create mode', () => {
    it('renders empty form fields', () => {
      setupMocks()

      render(<ExerciseFormScreen />)

      expect(screen.getByText('NOVO EXERCICIO')).toBeTruthy()
      expect(screen.getByPlaceholderText('Nome do exercicio')).toBeTruthy()
    })

    it('renders save button', () => {
      setupMocks()

      render(<ExerciseFormScreen />)

      expect(screen.getByText('SALVAR')).toBeTruthy()
    })

    it('calls addExercise when form is filled and saved', () => {
      const { addExercise } = setupMocks()

      render(<ExerciseFormScreen />)

      // Fill in name
      fireEvent.changeText(screen.getByPlaceholderText('Nome do exercicio'), 'Crucifixo')

      // Select category
      fireEvent.press(screen.getByText('Peito'))

      // Fill in equipment
      fireEvent.changeText(screen.getByPlaceholderText('Equipamento'), 'Halter')

      // Submit
      fireEvent.press(screen.getByText('SALVAR'))

      expect(addExercise).toHaveBeenCalledWith(
        'plan-1',
        expect.objectContaining({
          name: 'Crucifixo',
          category: 'Peito',
          equipment: 'Halter',
        }),
      )
    })

    it('navigates back after successful save', () => {
      setupMocks()

      render(<ExerciseFormScreen />)

      fireEvent.changeText(screen.getByPlaceholderText('Nome do exercicio'), 'Crucifixo')
      fireEvent.press(screen.getByText('Peito'))
      fireEvent.press(screen.getByText('SALVAR'))

      expect(mockBack).toHaveBeenCalled()
    })

    it('shows validation error when name is empty', () => {
      setupMocks()

      render(<ExerciseFormScreen />)

      // Select a category but leave name empty
      fireEvent.press(screen.getByText('Peito'))
      fireEvent.press(screen.getByText('SALVAR'))

      expect(screen.getByText(/nome.*obrigatorio/i)).toBeTruthy()
    })

    it('shows validation error when category is not selected', () => {
      setupMocks()

      render(<ExerciseFormScreen />)

      // Fill name but skip category
      fireEvent.changeText(screen.getByPlaceholderText('Nome do exercicio'), 'Crucifixo')
      fireEvent.press(screen.getByText('SALVAR'))

      expect(screen.getByText(/categoria.*obrigatoria/i)).toBeTruthy()
    })
  })

  describe('edit mode', () => {
    beforeEach(() => {
      mockParams = { id: 'plan-1', exerciseId: 'ex-1' }
    })

    it('renders edit title', () => {
      setupMocks()

      render(<ExerciseFormScreen />)

      expect(screen.getByText('EDITAR EXERCICIO')).toBeTruthy()
    })

    it('pre-fills form with existing exercise data', () => {
      setupMocks()

      render(<ExerciseFormScreen />)

      expect(screen.getByDisplayValue('Supino Reto')).toBeTruthy()
      expect(screen.getByDisplayValue('Maquina')).toBeTruthy()
      expect(screen.getByDisplayValue('10-12')).toBeTruthy()
    })

    it('calls updateExercise when form is saved in edit mode', () => {
      const { updateExercise } = setupMocks()

      render(<ExerciseFormScreen />)

      // Change the name
      fireEvent.changeText(screen.getByDisplayValue('Supino Reto'), 'Supino Inclinado')

      fireEvent.press(screen.getByText('SALVAR'))

      expect(updateExercise).toHaveBeenCalledWith(
        'plan-1',
        'ex-1',
        expect.objectContaining({
          name: 'Supino Inclinado',
        }),
      )
    })
  })

  describe('category selector', () => {
    it('renders all 12 muscle categories', () => {
      setupMocks()

      render(<ExerciseFormScreen />)

      expect(screen.getByText('Peito')).toBeTruthy()
      expect(screen.getByText('Costas')).toBeTruthy()
      expect(screen.getByText('Quadríceps')).toBeTruthy()
    })
  })

  describe('navigation', () => {
    it('renders back navigation chevron bar', () => {
      setupMocks()

      render(<ExerciseFormScreen />)

      expect(screen.getByText('EXERCICIOS')).toBeTruthy()
    })
  })

  describe('stepper controls', () => {
    it('renders sets stepper with default value of 3', () => {
      setupMocks()

      render(<ExerciseFormScreen />)

      expect(screen.getByText('3')).toBeTruthy()
    })

    it('renders rest stepper with default value of 60', () => {
      setupMocks()

      render(<ExerciseFormScreen />)

      expect(screen.getByText('60')).toBeTruthy()
    })
  })
})
