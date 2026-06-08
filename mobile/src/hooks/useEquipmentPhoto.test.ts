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
let mockRemoteTokens: { accessToken: string; refreshToken: string; expiresAt: string } | null =
  null

jest.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      user: mockAuthUser,
      remoteTokens: mockRemoteTokens,
      setRemoteTokens: jest.fn((tokens) => {
        mockRemoteTokens = tokens
      }),
      clearRemoteTokens: jest.fn(() => {
        mockRemoteTokens = null
      }),
    }),
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
    mockRemoteTokens = null
    mockFetch.mockReset()
    process.env.EXPO_PUBLIC_FORJA_API_URL = 'https://forja.example.com'
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
    it('uploads through the Next photo API when authenticated', async () => {
      mockAuthUser = { id: 'user-abc' }
      mockRemoteTokens = remoteTokens()
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }))
      ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///tmp/picked.jpg' }],
      })

      const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))
      await act(async () => {
        await result.current.pickPhoto('gallery')
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `https://forja.example.com/api/mobile/v1/photos/equipment/${EXERCISE_ID}`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer access-token',
          }),
        }),
      )
    })

    it('skips upload when user is not authenticated', async () => {
      mockAuthUser = null
      mockRemoteTokens = null
      ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///tmp/picked.jpg' }],
      })

      const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))
      await act(async () => {
        await result.current.pickPhoto('gallery')
      })

      expect(mockFetch).not.toHaveBeenCalled()
      expect(useAppStore.getState().equipmentPhotos[EXERCISE_ID]).toBeDefined()
    })

    it('preserves the local save even if the upload fails', async () => {
      mockAuthUser = { id: 'user-abc' }
      mockRemoteTokens = remoteTokens()
      mockFetch.mockRejectedValueOnce(new Error('network'))
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

    it('removes through the Next photo API when authenticated', () => {
      mockAuthUser = { id: 'user-abc' }
      mockRemoteTokens = remoteTokens()
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }))
      useAppStore.setState({
        equipmentPhotos: {
          [EXERCISE_ID]: 'file:///mock-docs/equipment-photos/supino-reto-vertical.jpg',
        },
      })

      const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))
      act(() => {
        result.current.removePhoto()
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `https://forja.example.com/api/mobile/v1/photos/equipment/${EXERCISE_ID}`,
        expect.objectContaining({ method: 'DELETE' }),
      )
    })

    it('skips remote removal when unauthenticated', () => {
      mockAuthUser = null
      mockRemoteTokens = null
      useAppStore.setState({
        equipmentPhotos: {
          [EXERCISE_ID]: 'file:///mock-docs/equipment-photos/supino-reto-vertical.jpg',
        },
      })

      const { result } = renderHook(() => useEquipmentPhoto(EXERCISE_ID))
      act(() => {
        result.current.removePhoto()
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('restoreEquipmentPhotosFromCloud', () => {
    it('does nothing when unauthenticated', async () => {
      mockAuthUser = null
      mockRemoteTokens = null

      await restoreEquipmentPhotosFromCloud()

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('lists and downloads missing photos through the Next photo API', async () => {
      mockAuthUser = { id: 'user-abc' }
      mockRemoteTokens = remoteTokens()
      mockFetch
        .mockResolvedValueOnce(
          jsonResponse({
            photos: [
              {
                exerciseId: 'supino-reto-vertical',
                downloadUrl:
                  '/api/mobile/v1/photos/equipment/supino-reto-vertical/download',
                updatedAt: '2026-05-18T12:00:00.000Z',
              },
              {
                exerciseId: 'agachamento',
                downloadUrl: '/api/mobile/v1/photos/equipment/agachamento/download',
                updatedAt: '2026-05-18T12:00:00.000Z',
              },
            ],
          }),
        )
        .mockResolvedValueOnce(binaryResponse(new ArrayBuffer(4)))
        .mockResolvedValueOnce(binaryResponse(new ArrayBuffer(4)))

      await restoreEquipmentPhotosFromCloud()

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://forja.example.com/api/mobile/v1/photos/equipment',
        expect.anything(),
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://forja.example.com/api/mobile/v1/photos/equipment/supino-reto-vertical/download',
        expect.anything(),
      )
      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(mockWrite).toHaveBeenCalledTimes(2)

      const stored = useAppStore.getState().equipmentPhotos
      expect(stored[EXERCISE_ID]).toBeDefined()
      expect(stored['agachamento' as ExerciseId]).toBeDefined()
    })

    it('skips photos already present locally', async () => {
      mockAuthUser = { id: 'user-abc' }
      mockRemoteTokens = remoteTokens()
      useAppStore.setState({
        equipmentPhotos: {
          [EXERCISE_ID]: 'file:///mock-docs/equipment-photos/supino-reto-vertical.jpg',
        },
      })
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          photos: [
            {
              exerciseId: 'supino-reto-vertical',
              downloadUrl: '/api/mobile/v1/photos/equipment/supino-reto-vertical/download',
              updatedAt: '2026-05-18T12:00:00.000Z',
            },
          ],
        }),
      )

      await restoreEquipmentPhotosFromCloud()

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})

function remoteTokens(): { accessToken: string; refreshToken: string; expiresAt: string } {
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: '2026-05-18T12:15:00.000Z',
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function binaryResponse(body: ArrayBuffer, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    arrayBuffer: async () => body,
  } as Response
}
