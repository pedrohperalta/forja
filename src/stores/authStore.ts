import { create } from 'zustand'
import { makeRedirectUri } from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  initialize: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,

  initialize: async (): Promise<void> => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    set({ session, user: session?.user ?? null, isLoading: false })

    supabase.auth.onAuthStateChange((_event, newSession) => {
      set({ session: newSession, user: newSession?.user ?? null })
    })
  },

  signInWithGoogle: async (): Promise<void> => {
    set({ isLoading: true })
    try {
      const redirectTo = makeRedirectUri({ scheme: 'forja' })

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })

      if (error ?? !data.url) throw error ?? new Error('No OAuth URL')

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

      // On iOS, ASWebAuthenticationSession intercepts the redirect internally —
      // Linking events never fire. Exchange the code here as the primary path.
      // On Android, the Linking listener in _layout.tsx handles it as a fallback.
      if (result.type === 'success') {
        const code = new URL(result.url).searchParams.get('code')
        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
        }
      }
    } catch (err) {
      console.error('[Auth] signInWithGoogle error:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  signOut: async (): Promise<void> => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },
}))
