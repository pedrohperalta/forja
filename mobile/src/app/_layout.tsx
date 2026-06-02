import '@/styles/global.css'

import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import * as SplashScreen from 'expo-splash-screen'
import { useAuthStore } from '@/stores/authStore'
import { sync } from '@/services/syncService'

// Keep splash visible until fonts are loaded
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [loaded, error] = useFonts({
    BebasNeue: require('../../assets/fonts/BebasNeue-Regular.ttf'),
    Syne: require('../../assets/fonts/Syne-Regular.ttf'),
    'Syne-SemiBold': require('../../assets/fonts/Syne-SemiBold.ttf'),
    'Syne-Bold': require('../../assets/fonts/Syne-Bold.ttf'),
  })

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync()
    }
  }, [loaded, error])

  const userId = useAuthStore((s) => s.user?.id)

  // Initialize auth session once
  useEffect(() => {
    useAuthStore.getState().initialize()
  }, [])

  // Sync whenever a user is present — covers startup with cached session
  // and fresh login via OAuth
  useEffect(() => {
    if (userId) {
      sync().catch(() => {})
    }
  }, [userId])

  // Wait for fonts before rendering
  if (!loaded && !error) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#080808' },
            animation: 'fade',
          }}
        />
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}
