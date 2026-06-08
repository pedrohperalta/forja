import { render, screen, fireEvent } from '@testing-library/react-native'

import ImportCaptureScreen from '@/app/import/index'

const mockBack = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}))

describe('ImportCaptureScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the disabled mobile import state', () => {
    render(<ImportCaptureScreen />)

    expect(screen.getByText('IMPORTAÇÃO INDISPONÍVEL')).toBeTruthy()
    expect(
      screen.getByText('A importação por IA agora está disponível apenas no admin web.'),
    ).toBeTruthy()
  })

  it('does not render the old photo import controls', () => {
    render(<ImportCaptureScreen />)

    expect(screen.queryByText('PROCESSAR')).toBeNull()
    expect(screen.queryByText('CAMERA')).toBeNull()
    expect(screen.queryByText('GALERIA')).toBeNull()
    expect(screen.queryByText('SUBSTITUIR')).toBeNull()
    expect(screen.queryByText('ADICIONAR')).toBeNull()
  })

  it('keeps back navigation available', () => {
    render(<ImportCaptureScreen />)

    fireEvent.press(screen.getByLabelText('Voltar para planos'))

    expect(mockBack).toHaveBeenCalled()
  })
})
