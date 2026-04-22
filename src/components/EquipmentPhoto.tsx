import { useState } from 'react'
import { Alert, Image, Modal, Pressable, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { useEquipmentPhoto } from '@/hooks/useEquipmentPhoto'
import type { ExerciseId } from '@/types'

type PickSource = 'camera' | 'gallery'

function promptPhotoSource(onSelect: (source: PickSource) => void): void {
  Alert.alert('Foto do aparelho', undefined, [
    { text: 'Câmera', onPress: () => onSelect('camera') },
    { text: 'Galeria', onPress: () => onSelect('gallery') },
    { text: 'Cancelar', style: 'cancel' },
  ])
}

type EquipmentPhotoProps = {
  exerciseId: ExerciseId
}

/** Equipment reference photo with empty placeholder and full-screen overlay. */
export function EquipmentPhoto({ exerciseId }: EquipmentPhotoProps): React.JSX.Element {
  const { photoUri, pickPhoto, removePhoto } = useEquipmentPhoto(exerciseId)
  const [overlayVisible, setOverlayVisible] = useState(false)

  const handleEmptyPress = (): void => {
    promptPhotoSource(pickPhoto)
  }

  const handleFilledPress = (): void => {
    setOverlayVisible(true)
  }

  const handleReplace = (): void => {
    setOverlayVisible(false)
    promptPhotoSource(pickPhoto)
  }

  const handleRemove = (): void => {
    removePhoto()
    setOverlayVisible(false)
  }

  const handleClose = (): void => {
    setOverlayVisible(false)
  }

  // Empty state — placeholder
  if (!photoUri) {
    return (
      <Pressable
        testID="equipment-photo-empty"
        onPress={handleEmptyPress}
        accessibilityRole="button"
        accessibilityLabel="Adicionar foto do aparelho"
        className="h-[72px] w-full flex-row items-center justify-center gap-3 rounded-lg border border-border bg-surface-2"
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
            stroke="#444444"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
            stroke="#444444"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text className="font-ui text-[12px] text-dim">Foto do aparelho</Text>
      </Pressable>
    )
  }

  // Filled state — full-width photo with 4:5 aspect ratio
  return (
    <>
      <Pressable
        testID="equipment-photo-filled"
        onPress={handleFilledPress}
        accessibilityRole="button"
        accessibilityLabel="Foto do aparelho. Toque para ver ou trocar"
        className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-border"
      >
        <Image
          source={{ uri: photoUri }}
          className="h-full w-full"
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      </Pressable>

      {/* Full-screen photo overlay */}
      <Modal visible={overlayVisible} transparent animationType="fade" onRequestClose={handleClose}>
        <View className="flex-1 bg-background/95">
          {/* Close button */}
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            className="absolute right-5 top-14 z-10 h-[44px] w-[44px] items-center justify-center"
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M18 6L6 18M6 6l12 12"
                stroke="#888888"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>

          {/* Photo */}
          <View className="flex-1 items-center justify-center px-6">
            <Image
              source={{ uri: photoUri }}
              className="aspect-[4/5] w-full rounded-lg"
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>

          {/* Actions */}
          <View className="px-6 pb-10">
            <Pressable
              onPress={handleReplace}
              accessibilityRole="button"
              accessibilityLabel="Trocar foto do aparelho"
              className="mb-3 h-[48px] items-center justify-center rounded-pill border border-border-med"
            >
              <Text className="font-ui text-[13px] text-text-med">Trocar foto</Text>
            </Pressable>
            <Pressable
              onPress={handleRemove}
              accessibilityRole="button"
              accessibilityLabel="Remover foto do aparelho"
              className="h-[48px] items-center justify-center rounded-pill border border-danger-dim"
            >
              <Text className="font-ui text-[13px] text-danger">Remover</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  )
}
