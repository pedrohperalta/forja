/**
 * Import Processing screen tests
 *
 * Tests progress display, per-photo status rendering,
 * auto-navigation to review on completion, and back
 * navigation disabled during processing.
 */

import { render, screen, waitFor } from '@testing-library/react-native'
import { BackHandler } from 'react-native'

import ImportProcessingScreen from '@/app/import/processing'
import type { ImportPhotoStatus } from '@/types'

import { useImportStore } from '@/stores/importStore'

// -- Mocks --

const mockReplace = jest.fn()
const mockBack = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
}))

// Mock useImportProcessing hook
const mockProcessPhotos = jest.fn()
let mockIsProcessing = false

jest.mock('@/hooks/useImportProcessing', () => ({
  useImportProcessing: () => ({
    processPhotos: mockProcessPhotos,
    isProcessing: mockIsProcessing,
  }),
}))

// Mock importStore
jest.mock('@/stores/importStore', () => ({
  useImportStore: jest.fn(),
}))

// Spy on BackHandler
const backHandlerSpy = jest.spyOn(BackHandler, 'addEventListener')

// -- Helpers --

type MockStoreState = {
  photos?: ImportPhotoStatus[]
  status?: string
}

function setupMocks({
  photos = [] as ImportPhotoStatus[],
  status = 'processing',
}: MockStoreState = {}) {
  const state = { photos, status }
  ;(useImportStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: typeof state) => unknown) => selector(state),
  )
  return state
}

// -- Tests --

describe('ImportProcessingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsProcessing = false
    mockProcessPhotos.mockResolvedValue(undefined)
  })

  it('renders processing title', () => {
    setupMocks({
      photos: [{ uri: 'file:///p1.jpg', status: 'uploading' }],
    })

    render(<ImportProcessingScreen />)

    expect(screen.getByText('PROCESSANDO')).toBeTruthy()
  })

  it('renders photo status list', () => {
    setupMocks({
      photos: [
        { uri: 'file:///p1.jpg', status: 'done' },
        { uri: 'file:///p2.jpg', status: 'uploading' },
        { uri: 'file:///p3.jpg', status: 'pending' },
      ],
    })

    render(<ImportProcessingScreen />)

    expect(screen.getByText('Foto 1')).toBeTruthy()
    expect(screen.getByText('Foto 2')).toBeTruthy()
    expect(screen.getByText('Foto 3')).toBeTruthy()
  })

  it('shows done status for completed photos', () => {
    setupMocks({
      photos: [{ uri: 'file:///p1.jpg', status: 'done' }],
    })

    render(<ImportProcessingScreen />)

    expect(screen.getByText('PRONTO')).toBeTruthy()
  })

  it('shows error status for failed photos', () => {
    setupMocks({
      photos: [{ uri: 'file:///p1.jpg', status: 'error' }],
    })

    render(<ImportProcessingScreen />)

    expect(screen.getByText('ERRO')).toBeTruthy()
  })

  it('calls processPhotos on mount', () => {
    setupMocks({
      photos: [{ uri: 'file:///p1.jpg', status: 'pending' }],
    })

    render(<ImportProcessingScreen />)

    expect(mockProcessPhotos).toHaveBeenCalledTimes(1)
  })

  it('navigates to review when status is reviewing', async () => {
    setupMocks({
      photos: [{ uri: 'file:///p1.jpg', status: 'done' }],
      status: 'reviewing',
    })
    mockIsProcessing = false

    render(<ImportProcessingScreen />)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/import/review')
    })
  })

  it('does not navigate while still processing', () => {
    setupMocks({
      photos: [{ uri: 'file:///p1.jpg', status: 'uploading' }],
      status: 'processing',
    })
    mockIsProcessing = true

    render(<ImportProcessingScreen />)

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('registers BackHandler to prevent back navigation during processing', () => {
    setupMocks({
      photos: [{ uri: 'file:///p1.jpg', status: 'uploading' }],
      status: 'processing',
    })
    mockIsProcessing = true

    render(<ImportProcessingScreen />)

    expect(backHandlerSpy).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function))
  })

  it('shows progress count', () => {
    setupMocks({
      photos: [
        { uri: 'file:///p1.jpg', status: 'done' },
        { uri: 'file:///p2.jpg', status: 'uploading' },
        { uri: 'file:///p3.jpg', status: 'pending' },
      ],
    })

    render(<ImportProcessingScreen />)

    expect(screen.getByText('1 / 3')).toBeTruthy()
  })
})
