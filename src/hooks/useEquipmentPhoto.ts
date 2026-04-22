import * as ImagePicker from 'expo-image-picker'
import { Paths, Directory, File } from 'expo-file-system'

import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import type { ExerciseId } from '@/types'

const PHOTOS_DIR_NAME = 'equipment-photos'
const PHOTOS_BUCKET = 'equipment-photos'

/** Builds the Storage path for a photo: `{userId}/{exerciseId}.jpg`. */
function getRemotePath(userId: string, exerciseId: ExerciseId): string {
  return `${userId}/${exerciseId}.jpg`
}

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
    const userId = useAuthStore.getState().user?.id
    if (userId) {
      try {
        const bytes = await destFile.bytes()
        await supabase.storage
          .from(PHOTOS_BUCKET)
          .upload(getRemotePath(userId, exerciseId), bytes, {
            contentType: 'image/jpeg',
            upsert: true,
          })
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

    const userId = useAuthStore.getState().user?.id
    if (userId) {
      void supabase.storage.from(PHOTOS_BUCKET).remove([getRemotePath(userId, exerciseId)])
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
  const userId = useAuthStore.getState().user?.id
  if (!userId) return

  const { data: entries, error } = await supabase.storage.from(PHOTOS_BUCKET).list(userId)
  if (error || !entries) return

  const dir = getPhotosDir()
  if (!dir.exists) {
    dir.create({ intermediates: true })
  }

  const { saveEquipmentPhoto, equipmentPhotos } = useAppStore.getState()

  for (const entry of entries) {
    const match = entry.name.match(/^(.+)\.jpg$/)
    if (!match || !match[1]) continue
    const exerciseId = match[1] as ExerciseId

    if (equipmentPhotos[exerciseId]) continue

    const destFile = getPhotoFile(exerciseId)

    // supabase-js storage.download() returns a Blob without arrayBuffer() in
    // React Native, so use a short-lived signed URL + fetch() instead.
    const { data: urlData, error: urlErr } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrl(`${userId}/${entry.name}`, 60)
    if (urlErr || !urlData?.signedUrl) continue

    try {
      const response = await fetch(urlData.signedUrl)
      const buffer = await response.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      destFile.write(bytes)
      saveEquipmentPhoto(exerciseId, destFile.uri)
    } catch {
      // Skip this photo; next sync will retry
    }
  }
}
