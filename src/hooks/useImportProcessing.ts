import { useState, useCallback } from 'react'

import { useImportStore } from '@/stores/importStore'
import { usePlanStore, incrementLabel } from '@/stores/planStore'
import { extractWorkout } from '@/services/importApi'
import type { ExtractedWorkout } from '@/types'

type UseImportProcessingReturn = {
  isProcessing: boolean
  processPhotos: () => Promise<void>
}

/**
 * Orchestrates the photo processing pipeline.
 *
 * Iterates importStore photos sequentially, generates labels from
 * planStore.nextLabel, calls importApi.extractWorkout for each,
 * updates photo statuses, aggregates workouts, and manages
 * importStore status transitions (processing → reviewing).
 */
export function useImportProcessing(): UseImportProcessingReturn {
  const [isProcessing, setIsProcessing] = useState(false)

  const processPhotos = useCallback(async () => {
    const { photos, updatePhotoStatus, setWorkouts, setStatus } = useImportStore.getState()

    setIsProcessing(true)
    setStatus('processing')

    // Generate sequential labels starting from planStore.nextLabel
    let currentLabel = usePlanStore.getState().nextLabel

    const aggregatedWorkouts: ExtractedWorkout[] = []

    for (const photo of photos) {
      const label = currentLabel
      currentLabel = incrementLabel(currentLabel)

      // Mark as uploading
      updatePhotoStatus(photo.uri, 'uploading')

      try {
        const workout = await extractWorkout(photo.uri, label)
        aggregatedWorkouts.push(workout)
        updatePhotoStatus(photo.uri, 'done')
      } catch (err) {
        console.error('[ImportProcessing] extractWorkout failed:', err)
        updatePhotoStatus(photo.uri, 'error')
      }
    }

    setWorkouts(aggregatedWorkouts)
    setStatus('reviewing')
    setIsProcessing(false)
  }, [])

  return { isProcessing, processPhotos }
}
