import { Stack } from 'expo-router'

/** Stack navigator layout for the import flow. */
export default function ImportLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
    />
  )
}
