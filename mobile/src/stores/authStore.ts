import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { makeRedirectUri } from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { Platform } from 'react-native'
import {
  createMobileApiClient,
  type MobileAuthUser,
} from '@/services/mobileApiClient'
import { mmkvStateStorage } from '@/storage/mmkv'

interface AuthState {
  user: MobileAuthUser | null
  session: AuthSession | null
  remoteTokens: RemoteTokens | null
  isLoading: boolean
  initialize: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  handleAuthCallback: (code: string) => Promise<void>
  signOut: () => Promise<void>
  setRemoteTokens: (tokens: RemoteTokens) => void
  clearRemoteTokens: () => void
}

export type RemoteTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export type AuthSession = {
  user: MobileAuthUser
  expiresAt: string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      remoteTokens: null,
      isLoading: true,

      initialize: async (): Promise<void> => {
        set({ isLoading: false })
      },

      signInWithGoogle: async (): Promise<void> => {
        set({ isLoading: true })
        try {
          const redirectTo = makeRedirectUri({ scheme: 'forja', path: 'auth/callback' })
          const authClient = createAuthClient()
          const { url } = await authClient.startGoogleAuth(redirectTo)

          const result = await WebBrowser.openAuthSessionAsync(url, redirectTo)

          // On iOS, ASWebAuthenticationSession intercepts the redirect internally —
          // Linking events never fire, and the /auth/callback route never renders.
          // Exchange the code here as the iOS-only path.
          if (Platform.OS === 'ios' && result.type === 'success') {
            const code = new URL(result.url).searchParams.get('code')
            if (code) {
              await useAuthStore.getState().handleAuthCallback(code)
            }
          }
        } catch (err) {
          console.error('[Auth] signInWithGoogle error:', err)
        } finally {
          set({ isLoading: false })
        }
      },

      handleAuthCallback: async (code: string): Promise<void> => {
        const redirectTo = makeRedirectUri({ scheme: 'forja', path: 'auth/callback' })
        const response = await createAuthClient().exchangeGoogleAuthCode(code, redirectTo)

        set({
          user: response.user,
          session: { user: response.user, expiresAt: response.tokens.expiresAt },
          remoteTokens: response.tokens,
        })
      },

      signOut: async (): Promise<void> => {
        const tokens = useAuthStore.getState().remoteTokens

        try {
          if (tokens) {
            await createAuthClient().logout(tokens.refreshToken)
          }
        } finally {
          set({ user: null, session: null, remoteTokens: null })
        }
      },

      setRemoteTokens: (tokens: RemoteTokens): void => {
        set({ remoteTokens: tokens })
      },

      clearRemoteTokens: (): void => {
        set({ remoteTokens: null })
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => mmkvStateStorage),
      version: 1,
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        remoteTokens: state.remoteTokens,
      }),
    },
  ),
)

function createAuthClient(): ReturnType<typeof createMobileApiClient> {
  return createMobileApiClient({
    getTokens: () => useAuthStore.getState().remoteTokens,
    setTokens: (tokens) => useAuthStore.getState().setRemoteTokens(tokens),
    clearTokens: () => useAuthStore.getState().clearRemoteTokens(),
  })
}
