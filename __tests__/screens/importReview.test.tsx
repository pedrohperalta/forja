/**
 * Import Review screen tests
 *
 * Tests rendering of extracted workouts for review, inline exercise editing,
 * confirm import flow with skippedPlanId alert, and navigation.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'
import { Alert } from 'react-native'

import { useImportStore } from '@/stores/importStore'
import type { ExtractedWorkout } from '@/types'

// -- Mocks --

const mockReplace = jest.fn()
const mockBack = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
}))

const mockGetState = jest.fn()
const mockUseImportStore = jest.fn() as jest.Mock & { getState: jest.Mock }
mockUseImportStore.getState = mockGetState

jest.mock('@/stores/importStore', () => ({
  useImportStore: mockUseImportStore,
}))

jest.spyOn(Alert, 'alert')

// Must be imported after mocks are set up
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ImportReviewScreen = require('@/app/import/review').default as React.ComponentType

// -- Helpers --

const makeWorkout = (overrides: Partial<ExtractedWorkout> = {}): ExtractedWorkout => ({
  name: 'Treino A',
  exercises: [
    {
      name: 'Supino Reto',
      category: 'Peito',
      sets: 3,
      reps: '10-12',
      restSeconds: 60,
      equipment: 'Barra',
      confidence: 0.95,
    },
    {
      name: 'Crucifixo',
      category: 'Peito',
      sets: 3,
      reps: '12-15',
      restSeconds: 60,
      equipment: 'Halter',
      confidence: 0.72,
    },
  ],
  ...overrides,
})

type MockStoreState = {
  workouts?: ExtractedWorkout[]
  mode?: 'replace' | 'add'
  status?: string
  skippedPlanId?: string | null
  confirmImport?: jest.Mock
  reset?: jest.Mock
  updateExtractedExercise?: jest.Mock
}

function setupMocks({
  workouts = [makeWorkout()],
  mode = 'replace',
  status = 'reviewing',
  skippedPlanId = null,
  confirmImport = jest.fn(),
  reset = jest.fn(),
  updateExtractedExercise = jest.fn(),
}: MockStoreState = {}) {
  const state = {
    workouts,
    mode,
    status,
    skippedPlanId,
    confirmImport,
    reset,
    updateExtractedExercise,
  }
  mockUseImportStore.mockImplementation(
    (selector: (s: typeof state) => unknown) => selector(state),
  )
  mockGetState.mockReturnValue(state)
  return state
}

// -- Tests --

describe('ImportReviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders screen title', () => {
    setupMocks()

    render(<ImportReviewScreen />)

    expect(screen.getByText('REVISAR IMPORTAÇÃO')).toBeTruthy()
  })

  it('renders workout section with name', () => {
    setupMocks({ workouts: [makeWorkout({ name: 'Treino A' })] })

    render(<ImportReviewScreen />)

    expect(screen.getByText('Treino A')).toBeTruthy()
  })

  it('renders exercise rows for each exercise', () => {
    setupMocks()

    render(<ImportReviewScreen />)

    expect(screen.getByText('Supino Reto')).toBeTruthy()
    expect(screen.getByText('Crucifixo')).toBeTruthy()
  })

  it('renders multiple workouts', () => {
    setupMocks({
      workouts: [
        makeWorkout({ name: 'Treino A' }),
        makeWorkout({ name: 'Treino B' }),
      ],
    })

    render(<ImportReviewScreen />)

    expect(screen.getByText('Treino A')).toBeTruthy()
    expect(screen.getByText('Treino B')).toBeTruthy()
  })

  it('renders CONFIRMAR button', () => {
    setupMocks()

    render(<ImportReviewScreen />)

    expect(screen.getByText('CONFIRMAR')).toBeTruthy()
  })

  it('renders mode indicator for replace mode', () => {
    setupMocks({ mode: 'replace' })

    render(<ImportReviewScreen />)

    expect(screen.getByText('SUBSTITUIR')).toBeTruthy()
  })

  it('renders mode indicator for add mode', () => {
    setupMocks({ mode: 'add' })

    render(<ImportReviewScreen />)

    expect(screen.getByText('ADICIONAR')).toBeTruthy()
  })

  it('calls confirmImport, navigates, and resets on confirm press', () => {
    const state = setupMocks({ skippedPlanId: null })

    render(<ImportReviewScreen />)

    fireEvent.press(screen.getByText('CONFIRMAR'))

    expect(state.confirmImport).toHaveBeenCalled()
    expect(mockReplace).toHaveBeenCalledWith('/plans')
    expect(state.reset).toHaveBeenCalled()
  })

  it('shows alert when skippedPlanId is set after confirm', () => {
    const state = setupMocks()
    // Simulate confirmImport setting skippedPlanId
    state.confirmImport.mockImplementation(() => {
      // After confirmImport, getState returns updated state with skippedPlanId
      mockGetState.mockReturnValue({ ...state, skippedPlanId: 'plan-skipped-1' })
    })

    render(<ImportReviewScreen />)

    fireEvent.press(screen.getByText('CONFIRMAR'))

    expect(Alert.alert).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('treino ativo'),
    )
  })

  it('calls updateExtractedExercise when exercise is edited', () => {
    const state = setupMocks()

    render(<ImportReviewScreen />)

    // Tap exercise to enter edit mode
    const editButtons = screen.getAllByLabelText('Editar exercício')
    fireEvent.press(editButtons[0])

    // Change name
    const nameInput = screen.getByDisplayValue('Supino Reto')
    fireEvent.changeText(nameInput, 'Supino Inclinado')
    fireEvent(nameInput, 'submitEditing')

    expect(state.updateExtractedExercise).toHaveBeenCalledWith(0, 0, { name: 'Supino Inclinado' })
  })

  it('renders back navigation', () => {
    setupMocks()

    render(<ImportReviewScreen />)

    expect(screen.getByText('PROCESSAMENTO')).toBeTruthy()
  })

  it('navigates back on chevron press', () => {
    setupMocks()

    render(<ImportReviewScreen />)

    fireEvent.press(screen.getByLabelText('Voltar para processamento'))

    expect(mockBack).toHaveBeenCalled()
  })

  it('renders exercise count per workout', () => {
    setupMocks()

    render(<ImportReviewScreen />)

    expect(screen.getByText('2 exercícios')).toBeTruthy()
  })
})
