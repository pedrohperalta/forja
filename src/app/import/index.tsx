import { useEffect } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import * as ImagePicker from 'expo-image-picker'

import { useImportStore } from '@/stores/importStore'
import { useHaptics } from '@/hooks/useHaptics'
import { ImportPhotoCard } from '@/components/import/ImportPhotoCard'
import { ImportModeSelector } from '@/components/import/ImportModeSelector'

const MAX_PHOTOS = 5

/** Import capture screen — photograph training programs for AI extraction. */
export default function ImportCaptureScreen(): React.JSX.Element {
  const photos = useImportStore((s) => s.photos)
  const mode = useImportStore((s) => s.mode)
  const addPhoto = useImportStore((s) => s.addPhoto)
  const removePhoto = useImportStore((s) => s.removePhoto)
  const setMode = useImportStore((s) => s.setMode)
  const setStatus = useImportStore((s) => s.setStatus)
  const router = useRouter()
  const haptics = useHaptics()

  const canAddPhoto = photos.length < MAX_PHOTOS
  const hasPhotos = photos.length > 0

  // Set status to capturing on mount
  useEffect(() => {
    setStatus('capturing')
  }, [setStatus])

  const handleCamera = async (): Promise<void> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (permission.status !== 'granted') return

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images' as ImagePicker.MediaType],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      haptics.light()
      addPhoto(result.assets[0].uri)
    }
  }

  const handleGallery = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images' as ImagePicker.MediaType],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      haptics.light()
      addPhoto(result.assets[0].uri)
    }
  }

  const handleProcess = (): void => {
    if (!hasPhotos) return
    haptics.light()
    router.push('/import/processing')
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 pt-14">
        {/* Chevron bar — back to plans */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para planos"
          onPress={() => router.back()}
          className="mb-4 h-[44px] flex-row items-center"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 19l-7-7 7-7"
              stroke="#8A8A8A"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text className="ml-1 font-ui text-[11px] uppercase tracking-[2px] text-muted">
            PLANOS
          </Text>
        </Pressable>

        {/* Title */}
        <Text className="font-display text-[36px] tracking-[1px] text-text">IMPORTAR TREINOS</Text>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {/* Mode selector */}
        <View className="mb-6">
          <Text className="mb-3 font-ui text-[10px] uppercase tracking-[2px] text-accent">
            MODO
          </Text>
          <ImportModeSelector mode={mode} onModeChange={setMode} />
        </View>

        {/* Photo section */}
        <View className="mb-6">
          <Text className="mb-3 font-ui text-[10px] uppercase tracking-[2px] text-accent">
            FOTOS ({photos.length}/{MAX_PHOTOS})
          </Text>

          {/* Photo grid */}
          <View className="flex-row flex-wrap gap-3">
            {photos.map((photo) => (
              <ImportPhotoCard
                key={photo.uri}
                uri={photo.uri}
                status={photo.status}
                onRemove={() => removePhoto(photo.uri)}
              />
            ))}
          </View>

          {/* Add photo buttons */}
          {canAddPhoto ? (
            <View className="mt-4 flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tirar foto"
                onPress={handleCamera}
                className="flex-1 items-center rounded-pill border border-border-med bg-surface py-3"
              >
                <Text className="font-ui text-[12px] uppercase tracking-[1.5px] text-text-med">
                  CAMERA
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Escolher da galeria"
                onPress={handleGallery}
                className="flex-1 items-center rounded-pill border border-border-med bg-surface py-3"
              >
                <Text className="font-ui text-[12px] uppercase tracking-[1.5px] text-text-med">
                  GALERIA
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View className="border-t border-border bg-background px-6 pb-10 pt-4">
        <Pressable
          accessibilityRole="button"
          onPress={handleProcess}
          className={`h-[56px] items-center justify-center rounded-pill ${
            hasPhotos ? 'bg-accent' : 'bg-surface-2'
          }`}
        >
          <Text
            className={`font-ui text-[14px] font-semibold uppercase tracking-[2px] ${
              hasPhotos ? 'text-background' : 'text-dim'
            }`}
          >
            PROCESSAR
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
