import * as WebBrowser from 'expo-web-browser'

import { useAuthStore } from '@/stores/authStore'

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'forja://auth/callback'),
}))

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.EXPO_PUBLIC_FORJA_API_URL = 'https://forja.example.com'
    useAuthStore.setState({
      user: null,
      session: null,
      remoteTokens: null,
      isLoading: true,
    })
  })

  it('initializes without Supabase session lookup', async () => {
    await useAuthStore.getState().initialize()

    expect(useAuthStore.getState().isLoading).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('starts Google auth through the Next backend and exchanges returned callback code', async () => {
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
      1,
      'https://forja.example.com/api/mobile/v1/auth/google/start',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ redirectUri: 'forja://auth/callback' }),
      }),
    )
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
