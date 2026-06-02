import { Redirect, Stack } from 'expo-router'
import { useWorkoutStore } from '@/stores/workoutStore'

export default function WorkoutLayout() {
  const status = useWorkoutStore((s) => s.status)

  // Guard: prevent deep-linking into workout screens without an active session
  if (status === 'idle') {
    return <Redirect href="/" />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
    />
  )
}
