/**
 * EmptyPlans component tests — TDD
 *
 * Tests rendering of empty state message and CTA to create first plan.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'
import { EmptyPlans } from '@/components/EmptyPlans'

const mockPush = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('EmptyPlans', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the empty state headline', () => {
    render(<EmptyPlans />)

    expect(screen.getByText('Sem Treinos')).toBeTruthy()
  })

  it('renders the supporting text', () => {
    render(<EmptyPlans />)

    expect(screen.getByText('Crie seu primeiro plano de treino para começar.')).toBeTruthy()
  })

  it('renders the CTA button', () => {
    render(<EmptyPlans />)

    expect(screen.getByText('CRIAR PRIMEIRO PLANO')).toBeTruthy()
  })

  it('navigates to /plans/ when CTA is pressed', () => {
    render(<EmptyPlans />)

    fireEvent.press(screen.getByText('CRIAR PRIMEIRO PLANO'))

    expect(mockPush).toHaveBeenCalledWith('/plans/')
  })

  it('has correct accessibility label on CTA', () => {
    render(<EmptyPlans />)

    expect(screen.getByLabelText('Criar primeiro plano de treino')).toBeTruthy()
  })

  it('renders import button', () => {
    render(<EmptyPlans />)

    expect(screen.getByText('IMPORTAR TREINO')).toBeTruthy()
  })

  it('navigates to /import/ when import button is pressed', () => {
    render(<EmptyPlans />)

    fireEvent.press(screen.getByText('IMPORTAR TREINO'))

    expect(mockPush).toHaveBeenCalledWith('/import')
  })
})
