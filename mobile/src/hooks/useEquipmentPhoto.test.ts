/**
 * useEquipmentPhoto hook tests
 *
 * Tests photo picking, saving, and deletion logic
 * for equipment reference photos keyed by exercise ID.
 */

import { renderHook, act } from '@testing-library/react-native'
import * as ImagePicker from 'expo-image-picker'

import { useAppStore } from '@/stores/appStore'
import { useEquipmentPhoto, restoreEquipmentPhotosFromCloud } from '@/hooks/useEquipmentPhoto'
import { clearMockStorage } from '@/storage/__mocks__/mmkv'
import type { ExerciseId } from '@/types'

jest.mock('@/storage/mmkv', () => require('@/storage/__mocks__/mmkv'))

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  MediaType: { Images: 'images' },
}))

let mockAuthUser: { id: string } | null = null

jest.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => ({ user: mockAuthUser }) },
}))

const mockStorageUpload = jest.fn().mockResolvedValue({ data: {}, error: null })
const mockStorageRemove = jest.fn().mockResolvedValue({ data: {}, error: null })
const mockStorageList = jest.fn().mockResolvedValue({ data: [], error: null })
const mockStorageCreateSignedUrl = jest
  .fn()
  .mockResolvedValue({ data: { signedUrl: 'https://example.com/signed' }, error: null })

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockStorageUpload(...args),
        remove: (...args: unknown[]) => mockStorageRemove(...args),
        list: (...args: unknown[]) => mockStorageList(...args),
        createSignedUrl: (...args: unknown[]) => mockStorageCreateSignedUrl(...args),
      }),
    },
  },
}))

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

// Mock v2 class-based API
const mockCopy = jest.fn()
const mockDelete = jest.fn()
const mockDirCreate = jest.fn()
const mockWrite = jest.fn()

jest.mock('expo-file-system', () => ({
  Paths: { document: { uri: 'file:///mock-docs/' } },
  Directory: jest.fn().mockImplementation((...args: unknown[]) => {
    // Directory(Paths.document, 'equipment-photos') → dir object
    const parts = args.map((a) =>
      typeof a === 'object' && a !== null && 'uri' in a ? (a as { uri: string }).uri : a,
    )
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
      bytes: jest.fn().mockResolvedValue(new Uint8Array([0xff, 0xd8, 0xff])),
      write: mockWrite,
    }
  }),
}))

const EXERCISE_ID = 'supino-reto-vertical' as ExerciseId

describe('useEquipmentPhoto', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAppStore.setState({ equipmentPhotos: {} })
    clearMockStorage()
    mockAuthUser = null
  })

  it('returns undefined when no photo exists', () => {
    const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))

    expect(result.current.photoUri).toBeUndefined()
  })

  it('returns photo URI when photo exists in store', () => {
    useAppStore.setState({
      equipmentPhotos: {
        [EXERCISE_ID]: 'file:///mock-docs/equipment-photos/supino-reto-vertical.jpg',
      },
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
      equipmentPhotos: {
        [EXERCISE_ID]: 'file:///mock-docs/equipment-photos/supino-reto-vertical.jpg',
      },
    })

    const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))

    act(() => {
      result.current.removePhoto()
    })

    expect(useAppStore.getState().equipmentPhotos[EXERCISE_ID]).toBeUndefined()
  })

  describe('cloud backup', () => {
    it('uploads to Supabase Storage at {userId}/{exerciseId}.jpg when authenticated', async () => {
      mockAuthUser = { id: 'user-abc' }
      ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///tmp/picked.jpg' }],
      })

      const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))
      await act(async () => {
        await result.current.pickPhoto('gallery')
      })

      expect(mockStorageUpload).toHaveBeenCalled()
      const [path] = mockStorageUpload.mock.calls[0] ?? []
      expect(path).toBe(`user-abc/${EXERCISE_ID}.jpg`)
    })

    it('skips upload when user is not authenticated', async () => {
      mockAuthUser = null
      ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///tmp/picked.jpg' }],
      })

      const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))
      await act(async () => {
        await result.current.pickPhoto('gallery')
      })

      expect(mockStorageUpload).not.toHaveBeenCalled()
      expect(useAppStore.getState().equipmentPhotos[EXERCISE_ID]).toBeDefined()
    })

    it('preserves the local save even if the upload fails', async () => {
      mockAuthUser = { id: 'user-abc' }
      mockStorageUpload.mockRejectedValueOnce(new Error('network'))
      ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///tmp/picked.jpg' }],
      })

      const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))
      await act(async () => {
        await result.current.pickPhoto('gallery')
      })

      expect(useAppStore.getState().equipmentPhotos[EXERCISE_ID]).toBeDefined()
    })

    it('removes from Supabase Storage when removePhoto runs authenticated', () => {
      mockAuthUser = { id: 'user-abc' }
      useAppStore.setState({
        equipmentPhotos: {
          [EXERCISE_ID]: 'file:///mock-docs/equipment-photos/supino-reto-vertical.jpg',
        },
      })

      const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))
      act(() => {
        result.current.removePhoto()
      })

      expect(mockStorageRemove).toHaveBeenCalledWith([`user-abc/${EXERCISE_ID}.jpg`])
    })

    it('skips remote removal when unauthenticated', () => {
      mockAuthUser = null
      useAppStore.setState({
        equipmentPhotos: {
          [EXERCISE_ID]: 'file:///mock-docs/equipment-photos/supino-reto-vertical.jpg',
        },
      })

      const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))
      act(() => {
        result.current.removePhoto()
      })

      expect(mockStorageRemove).not.toHaveBeenCalled()
    })
  })

  describe('restoreEquipmentPhotosFromCloud', () => {
    it('does nothing when unauthenticated', async () => {
      mockAuthUser = null

      await restoreEquipmentPhotosFromCloud()

      expect(mockStorageList).not.toHaveBeenCalled()
    })

    it('lists the user prefix, downloads missing photos via signed URL, and saves them locally', async () => {
      mockAuthUser = { id: 'user-abc' }
      mockStorageList.mockResolvedValueOnce({
        data: [{ name: 'supino-reto-vertical.jpg' }, { name: 'agachamento.jpg' }],
        error: null,
      })
      mockFetch.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(4)),
      })

      await restoreEquipmentPhotosFromCloud()

      expect(mockStorageList).toHaveBeenCalledWith('user-abc')
      expect(mockStorageCreateSignedUrl).toHaveBeenCalledWith(
        'user-abc/supino-reto-vertical.jpg',
        60,
      )
      expect(mockStorageCreateSignedUrl).toHaveBeenCalledWith('user-abc/agachamento.jpg', 60)
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockWrite).toHaveBeenCalledTimes(2)

      const stored = useAppStore.getState().equipmentPhotos
      expect(stored[EXERCISE_ID]).toBeDefined()
      expect(stored['agachamento' as ExerciseId]).toBeDefined()
    })

    it('skips photos already present locally', async () => {
      mockAuthUser = { id: 'user-abc' }
      useAppStore.setState({
        equipmentPhotos: {
          [EXERCISE_ID]: 'file:///mock-docs/equipment-photos/supino-reto-vertical.jpg',
        },
      })
      mockStorageList.mockResolvedValueOnce({
        data: [{ name: 'supino-reto-vertical.jpg' }],
        error: null,
      })

      await restoreEquipmentPhotosFromCloud()

      expect(mockStorageCreateSignedUrl).not.toHaveBeenCalled()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})
