/**
 * useEquipmentPhoto hook tests
 *
 * Tests photo picking, saving, and deletion logic
 * for equipment reference photos keyed by exercise ID.
 */

import { renderHook, act } from '@testing-library/react-native'
import * as ImagePicker from 'expo-image-picker'

import { useAppStore } from '@/stores/appStore'
import { useEquipmentPhoto } from '@/hooks/useEquipmentPhoto'
import { clearMockStorage } from '@/storage/__mocks__/mmkv'
import type { ExerciseId } from '@/types'

jest.mock('@/storage/mmkv', () => require('@/storage/__mocks__/mmkv'))

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  MediaType: { Images: 'images' },
}))

// Mock v2 class-based API
const mockCopy = jest.fn()
const mockDelete = jest.fn()
const mockDirCreate = jest.fn()

jest.mock('expo-file-system', () => ({
  Paths: { document: { uri: 'file:///mock-docs/' } },
  Directory: jest.fn().mockImplementation((...args: unknown[]) => {
    // Directory(Paths.document, 'equipment-photos') → dir object
    const parts = args.map((a) => (typeof a === 'object' && a !== null && 'uri' in a ? (a as { uri: string }).uri : a))
    const uri = parts.join('')
    return {
      uri: uri.endsWith('/') ? uri : `${uri}/`,
      exists: false,
      create: mockDirCreate,
    }
  }),
  File: jest.fn().mockImplementation((...args: unknown[]) => {
    // Build URI from args (Directory objects or strings)
    const parts = args.map((a) => {
      if (typeof a === 'string') return a
      if (typeof a === 'object' && a !== null && 'uri' in a) return (a as { uri: string }).uri
      return ''
    })
    const uri = parts.join('')
    return {
      uri,
      exists: false,
      copy: mockCopy,
      delete: mockDelete,
    }
  }),
}))

const EXERCISE_ID = 'supino-reto-vertical' as ExerciseId

describe('useEquipmentPhoto', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAppStore.setState({ equipmentPhotos: {} })
    clearMockStorage()
  })

  it('returns undefined when no photo exists', () => {
    const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))

    expect(result.current.photoUri).toBeUndefined()
  })

  it('returns photo URI when photo exists in store', () => {
    useAppStore.setState({
      equipmentPhotos: { [EXERCISE_ID]: 'file:///mock-docs/equipment-photos/supino-reto-vertical.jpg' },
    })

    const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))

    expect(result.current.photoUri).toBe(
      'file:///mock-docs/equipment-photos/supino-reto-vertical.jpg',
    )
  })

  it('picks photo from gallery and saves to store', async () => {
    const mockUri = 'file:///tmp/picked-image.jpg'
    ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: mockUri }],
    })

    const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))

    await act(async () => {
      await result.current.pickPhoto('gallery')
    })

    // Directory should be created and file copied
    expect(mockDirCreate).toHaveBeenCalledWith({ intermediates: true })
    expect(mockCopy).toHaveBeenCalled()
    expect(useAppStore.getState().equipmentPhotos[EXERCISE_ID]).toBeDefined()
  })

  it('picks photo from camera and saves to store', async () => {
    const mockUri = 'file:///tmp/camera-image.jpg'
    ;(ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    })
    ;(ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: mockUri }],
    })

    const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))

    await act(async () => {
      await result.current.pickPhoto('camera')
    })

    expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled()
    expect(mockCopy).toHaveBeenCalled()
    expect(useAppStore.getState().equipmentPhotos[EXERCISE_ID]).toBeDefined()
  })

  it('does nothing when user cancels picker', async () => {
    ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: [],
    })

    const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))

    await act(async () => {
      await result.current.pickPhoto('gallery')
    })

    expect(mockCopy).not.toHaveBeenCalled()
    expect(useAppStore.getState().equipmentPhotos[EXERCISE_ID]).toBeUndefined()
  })

  it('does nothing when camera permission is denied', async () => {
    ;(ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    })

    const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))

    await act(async () => {
      await result.current.pickPhoto('camera')
    })

    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled()
    expect(useAppStore.getState().equipmentPhotos[EXERCISE_ID]).toBeUndefined()
  })

  it('removes photo file and store entry', () => {
    useAppStore.setState({
      equipmentPhotos: { [EXERCISE_ID]: 'file:///mock-docs/equipment-photos/supino-reto-vertical.jpg' },
    })

    const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))

    act(() => {
      result.current.removePhoto()
    })

    expect(useAppStore.getState().equipmentPhotos[EXERCISE_ID]).toBeUndefined()
  })
})
