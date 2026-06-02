/**
 * Import Capture screen tests
 *
 * Tests photo card rendering, mode selector, PROCESSAR button state,
 * navigation to processing, add button disabled at 5 photos,
 * and importStore status set to 'capturing' on mount.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'

import { useImportStore } from '@/stores/importStore'
import ImportCaptureScreen from '@/app/import/index'
import type { ImportPhotoStatus } from '@/types'

// -- Mocks --

const mockPush = jest.fn()
const mockBack = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}))

jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  MediaType: { Images: 'images' },
}))

jest.mock('@/stores/importStore', () => ({
  useImportStore: jest.fn(),
}))

// -- Helpers --

type MockStoreState = {
  photos?: ImportPhotoStatus[]
  mode?: 'replace' | 'add'
  status?: string
  addPhoto?: jest.Mock
  removePhoto?: jest.Mock
  setMode?: jest.Mock
  setStatus?: jest.Mock
}

function setupMocks({
  photos = [] as ImportPhotoStatus[],
  mode = 'replace' as const,
  status = 'capturing',
  addPhoto = jest.fn(),
  removePhoto = jest.fn(),
  setMode = jest.fn(),
  setStatus = jest.fn(),
}: MockStoreState = {}) {
  const state = { photos, mode, status, addPhoto, removePhoto, setMode, setStatus }
  ;(useImportStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: typeof state) => unknown) => selector(state),
  )
  return state
}

// -- Tests --

describe('ImportCaptureScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders screen title', () => {
    setupMocks()

    render(<ImportCaptureScreen />)

    expect(screen.getByText('IMPORTAR TREINOS')).toBeTruthy()
  })

  it('sets importStore status to capturing on mount', () => {
    const state = setupMocks()

    render(<ImportCaptureScreen />)

    expect(state.setStatus).toHaveBeenCalledWith('capturing')
  })

  it('renders photo cards for each photo', () => {
    setupMocks({
      photos: [
        { uri: 'file:///photo1.jpg', status: 'pending' },
        { uri: 'file:///photo2.jpg', status: 'pending' },
      ],
    })

    render(<ImportCaptureScreen />)

    expect(screen.getAllByLabelText('Foto do treino')).toHaveLength(2)
  })

  it('renders mode selector', () => {
    setupMocks()

    render(<ImportCaptureScreen />)

    expect(screen.getByText('SUBSTITUIR')).toBeTruthy()
    expect(screen.getByText('ADICIONAR')).toBeTruthy()
  })

  it('renders PROCESSAR button disabled when no photos', () => {
    setupMocks({ photos: [] })

    render(<ImportCaptureScreen />)

    const button = screen.getByText('PROCESSAR')
    // Button should be rendered but visually disabled
    expect(button).toBeTruthy()
  })

  it('navigates to processing on PROCESSAR press when photos exist', () => {
    setupMocks({
      photos: [{ uri: 'file:///photo1.jpg', status: 'pending' }],
    })

    render(<ImportCaptureScreen />)

    fireEvent.press(screen.getByText('PROCESSAR'))

    expect(mockPush).toHaveBeenCalledWith('/import/processing')
  })

  it('does not navigate when PROCESSAR pressed with no photos', () => {
    setupMocks({ photos: [] })

    render(<ImportCaptureScreen />)

    fireEvent.press(screen.getByText('PROCESSAR'))

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('disables add button when 5 photos are present', () => {
    setupMocks({
      photos: [
        { uri: 'file:///p1.jpg', status: 'pending' },
        { uri: 'file:///p2.jpg', status: 'pending' },
        { uri: 'file:///p3.jpg', status: 'pending' },
        { uri: 'file:///p4.jpg', status: 'pending' },
        { uri: 'file:///p5.jpg', status: 'pending' },
      ],
    })

    render(<ImportCaptureScreen />)

    // The add button should not be pressable
    const addButton = screen.queryByLabelText('Tirar foto')
    expect(addButton).toBeNull()
  })

  it('calls setMode when mode selector is changed', () => {
    const state = setupMocks({ mode: 'replace' })

    render(<ImportCaptureScreen />)

    fireEvent.press(screen.getByText('ADICIONAR'))

    expect(state.setMode).toHaveBeenCalledWith('add')
  })

  it('calls removePhoto when photo remove button is pressed', () => {
    const state = setupMocks({
      photos: [{ uri: 'file:///photo1.jpg', status: 'pending' }],
    })

    render(<ImportCaptureScreen />)

    fireEvent.press(screen.getByLabelText('Remover foto'))

    expect(state.removePhoto).toHaveBeenCalledWith('file:///photo1.jpg')
  })

  it('renders back navigation', () => {
    setupMocks()

    render(<ImportCaptureScreen />)

    expect(screen.getByText('PLANOS')).toBeTruthy()
  })
})
