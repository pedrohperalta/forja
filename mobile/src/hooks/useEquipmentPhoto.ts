import * as ImagePicker from 'expo-image-picker'
import { Paths, Directory, File } from 'expo-file-system'

import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import type { ExerciseId } from '@/types'
import { createMobileApiClient, type MobileApiClient } from '@/services/mobileApiClient'

const PHOTOS_DIR_NAME = 'equipment-photos'

/** Returns the photos directory instance. */
function getPhotosDir(): Directory {
  return new Directory(Paths.document, PHOTOS_DIR_NAME)
}

/** Builds the destination File for an exercise's equipment photo. */
function getPhotoFile(exerciseId: ExerciseId): File {
  return new File(getPhotosDir(), `${exerciseId}.jpg`)
}

type PickSource = 'camera' | 'gallery'

type UseEquipmentPhotoReturn = {
  photoUri: string | undefined
  pickPhoto: (source: PickSource) => Promise<void>
  removePhoto: () => void
}

function createPhotoApiClient(): MobileApiClient {
  return createMobileApiClient({
    getTokens: () => useAuthStore.getState().remoteTokens,
    setTokens: (tokens) => useAuthStore.getState().setRemoteTokens(tokens),
    clearTokens: () => useAuthStore.getState().clearRemoteTokens(),
  })
}

function canUseRemotePhotos(): boolean {
  const authState = useAuthStore.getState()

  return Boolean(authState.user && authState.remoteTokens)
}

/** Hook for managing equipment reference photos per exercise. */
export function useEquipmentPhoto(exerciseId: ExerciseId): UseEquipmentPhotoReturn {
  const photoUri = useAppStore((s) => s.equipmentPhotos[exerciseId])
  const saveEquipmentPhoto = useAppStore((s) => s.saveEquipmentPhoto)
  const deleteEquipmentPhoto = useAppStore((s) => s.deleteEquipmentPhoto)

  const pickPhoto = async (source: PickSource): Promise<void> => {
    let result: ImagePicker.ImagePickerResult

    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (permission.status !== 'granted') return

      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images' as ImagePicker.MediaType],
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
      })
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images' as ImagePicker.MediaType],
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
        legacy: true,
      })
    }

    if (result.canceled || !result.assets[0]) return

    const sourceUri = result.assets[0].uri

    // Ensure directory exists (synchronous v2 API)
    const dir = getPhotosDir()
    if (!dir.exists) {
      dir.create({ intermediates: true })
    }

    // Copy picked file to destination
    const sourceFile = new File(sourceUri)
    const destFile = getPhotoFile(exerciseId)
    if (destFile.exists) {
      destFile.delete()
    }
    sourceFile.copy(destFile)

    saveEquipmentPhoto(exerciseId, destFile.uri)

    // Cloud backup — best effort, local save always wins
    if (canUseRemotePhotos()) {
      try {
        const bytes = await destFile.bytes()
        await createPhotoApiClient().uploadEquipmentPhoto(exerciseId, bytes)
      } catch {
        // Swallow — photo stays local, re-sync handled elsewhere
      }
    }
  }

  const removePhoto = (): void => {
    const currentUri = useAppStore.getState().equipmentPhotos[exerciseId]
    if (currentUri) {
      const file = new File(currentUri)
      if (file.exists) {
        file.delete()
      }
    }
    deleteEquipmentPhoto(exerciseId)

    if (canUseRemotePhotos()) {
      void createPhotoApiClient().deleteEquipmentPhoto(exerciseId).catch(() => {})
    }
  }

  return { photoUri, pickPhoto, removePhoto }
}

/**
 * Pulls cloud-backed equipment photos to the local filesystem so they survive
 * reinstalls. Called from sync() after plan/session data is pulled. Skips files
 * already present locally.
 */
export async function restoreEquipmentPhotosFromCloud(): Promise<void> {
  if (!canUseRemotePhotos()) return

  const client = createPhotoApiClient()
  const { photos } = await client.listEquipmentPhotos()

  const dir = getPhotosDir()
  if (!dir.exists) {
    dir.create({ intermediates: true })
  }

  const { saveEquipmentPhoto, equipmentPhotos } = useAppStore.getState()

  for (const photo of photos) {
    const exerciseId = photo.exerciseId as ExerciseId

    if (equipmentPhotos[exerciseId]) continue

    const destFile = getPhotoFile(exerciseId)

    try {
      const bytes = await client.downloadEquipmentPhoto(photo.downloadUrl)
      destFile.write(bytes)
      saveEquipmentPhoto(exerciseId, destFile.uri)
    } catch {
      // Skip this photo; next sync will retry
    }
  }
}
