import { useEffect } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

/**
 * OAuth callback screen — handles the redirect from Supabase after Google login.
 * Expo Router routes `forja://auth/callback?code=xxx` here on Android.
 * On iOS, openAuthSessionAsync intercepts the redirect before this screen renders.
 */
export default function AuthCallbackScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>()
  const router = useRouter()

  useEffect(() => {
    if (!code) {
      router.replace('/')
      return
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(() => {
        router.replace('/history')
      })
      .catch((err) => {
        console.error('[Auth] callback exchange error:', err)
        router.replace('/')
      })
  }, [code, router])

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="small" color="#C2F000" />
      <Text className="mt-3 font-ui text-[12px] text-muted">Autenticando...</Text>
    </View>
  )
}
