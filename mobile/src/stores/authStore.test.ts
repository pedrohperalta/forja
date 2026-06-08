import * as WebBrowser from 'expo-web-browser'
import { Platform } from 'react-native'

import { clearMockStorage } from '@/storage/__mocks__/mmkv'
import { useAuthStore } from '@/stores/authStore'

jest.mock('@/storage/mmkv', () => require('@/storage/__mocks__/mmkv'))

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'forja://auth/callback'),
}))

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('authStore', () => {
  const originalPlatform = Platform.OS

  beforeEach(() => {
    jest.clearAllMocks()
    setPlatformOS(originalPlatform)
    process.env.EXPO_PUBLIC_FORJA_API_URL = 'https://forja.example.com'
    useAuthStore.setState({
      user: null,
      session: null,
      remoteTokens: null,
      isLoading: true,
    })
    clearMockStorage()
  })

  it('initializes without Supabase session lookup', async () => {
    await useAuthStore.getState().initialize()

    expect(useAuthStore.getState().isLoading).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('starts Google auth through the Next backend and leaves Android callbacks to the deep link route', async () => {
    setPlatformOS('android')
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          url: 'https://accounts.google.com/o/oauth2/v2/auth?state=signed',
        }),
      )
    ;(WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      url: 'forja://auth/callback?code=one-time-code',
    })

    await useAuthStore.getState().signInWithGoogle()

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'https://forja.example.com/api/mobile/v1/auth/google/start',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ redirectUri: 'forja://auth/callback' }),
      }),
    )
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('exchanges returned callback codes directly on iOS auth sessions', async () => {
    setPlatformOS('ios')
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          url: 'https://accounts.google.com/o/oauth2/v2/auth?state=signed',
        }),
      )
      .mockResolvedValueOnce(jsonResponse(authExchangeResponse()))
    ;(WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      url: 'forja://auth/callback?code=one-time-code',
    })

    await useAuthStore.getState().signInWithGoogle()

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://forja.example.com/api/mobile/v1/auth/google/exchange',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          code: 'one-time-code',
          redirectUri: 'forja://auth/callback',
        }),
      }),
    )
    expect(useAuthStore.getState().user?.email).toBe('user@example.com')
    expect(useAuthStore.getState().remoteTokens?.refreshToken).toBe('refresh-token')
  })

  it('exchanges auth callback codes through the Next backend', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(authExchangeResponse()))

    await useAuthStore.getState().handleAuthCallback('callback-code')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://forja.example.com/api/mobile/v1/auth/google/exchange',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          code: 'callback-code',
          redirectUri: 'forja://auth/callback',
        }),
      }),
    )
    expect(useAuthStore.getState().user?.id).toBe('user-id')
  })

  it('rehydrates mobile auth session and tokens from MMKV', async () => {
    jest.resetModules()
    jest.mock('@/storage/mmkv', () => require('@/storage/__mocks__/mmkv'))

    const { mmkvStateStorage: mockStorage } =
      require('@/storage/__mocks__/mmkv') as typeof import('@/storage/__mocks__/mmkv')

    mockStorage.setItem(
      'auth-store',
      JSON.stringify({
        state: {
          user: { id: 'user-id', email: 'user@example.com', name: 'User' },
          session: {
            user: { id: 'user-id', email: 'user@example.com', name: 'User' },
            expiresAt: '2026-01-01T00:15:00.000Z',
          },
          remoteTokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresAt: '2026-01-01T00:15:00.000Z',
          },
        },
        version: 1,
      }),
    )

    const { useAuthStore: freshStore } =
      require('@/stores/authStore') as typeof import('@/stores/authStore')

    await new Promise<void>((resolve) => {
      if (freshStore.persist.hasHydrated()) {
        resolve()
        return
      }
      const unsubscribe = freshStore.persist.onFinishHydration(() => {
        unsubscribe()
        resolve()
      })
    })

    expect(freshStore.getState().user?.email).toBe('user@example.com')
    expect(freshStore.getState().remoteTokens?.accessToken).toBe('access-token')
    expect(freshStore.getState().session?.expiresAt).toBe('2026-01-01T00:15:00.000Z')
    expect(freshStore.getState().isLoading).toBe(true)
  })

  it('signs out through the Next logout endpoint and clears local auth state', async () => {
    useAuthStore.getState().setRemoteTokens({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: '2026-01-01T00:15:00.000Z',
    })
    useAuthStore.setState({
      user: { id: 'user-id', email: 'user@example.com', name: 'User' },
      session: {
        user: { id: 'user-id', email: 'user@example.com', name: 'User' },
        expiresAt: '2026-01-01T00:15:00.000Z',
      },
    })
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }))

    await useAuthStore.getState().signOut()

    expect(mockFetch).toHaveBeenCalledWith(
      'https://forja.example.com/api/mobile/v1/auth/logout',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'refresh-token' }),
      }),
    )
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().session).toBeNull()
    expect(useAuthStore.getState().remoteTokens).toBeNull()
  })
})

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response
}

function authExchangeResponse(): unknown {
  return {
    user: { id: 'user-id', email: 'user@example.com', name: 'User' },
    tokens: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: '2026-01-01T00:15:00.000Z',
    },
  }
}

function setPlatformOS(os: typeof Platform.OS): void {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: os,
  })
}
