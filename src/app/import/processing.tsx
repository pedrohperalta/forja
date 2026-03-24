import { useEffect } from 'react'
import { View, Text, BackHandler } from 'react-native'
import { useRouter } from 'expo-router'

import { useImportStore } from '@/stores/importStore'
import { useImportProcessing } from '@/hooks/useImportProcessing'
import { ProgressBar } from '@/components/ProgressBar'

/** Status label map — Portuguese UI text. */
const STATUS_LABELS: Record<string, string> = {
  pending: 'PENDENTE',
  uploading: 'ENVIANDO',
  done: 'PRONTO',
  error: 'ERRO',
}

/** Status text color map. */
const STATUS_TEXT_COLORS: Record<string, string> = {
  pending: 'text-dim',
  uploading: 'text-accent',
  done: 'text-accent',
  error: 'text-danger',
}

/** Import processing screen — shows progress while AI extracts workouts from photos. */
export default function ImportProcessingScreen(): React.JSX.Element {
  const photos = useImportStore((s) => s.photos)
  const status = useImportStore((s) => s.status)
  const { processPhotos, isProcessing } = useImportProcessing()
  const router = useRouter()

  const completedCount = photos.filter((p) => p.status === 'done' || p.status === 'error').length

  // Start processing on mount
  useEffect(() => {
    processPhotos()
  }, [processPhotos])

  // Disable hardware back during processing
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      // Block back navigation while processing
      return true
    })

    return () => subscription.remove()
  }, [])

  // Auto-navigate to review when processing completes
  useEffect(() => {
    if (status === 'reviewing' && !isProcessing) {
      router.replace('/import/review' as never)
    }
  }, [status, isProcessing, router])

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 pt-14">
        <Text className="font-display text-[36px] tracking-[1px] text-text">PROCESSANDO</Text>
      </View>

      {/* Progress section */}
      <View className="px-6 pt-8">
        {/* Progress count */}
        <Text className="mb-4 text-center font-display text-[28px] text-accent">
          {completedCount} / {photos.length}
        </Text>

        {/* Progress bar */}
        <ProgressBar current={completedCount} total={photos.length} />

        {/* Photo status list */}
        <View className="mt-8 gap-3">
          {photos.map((photo, index) => (
            <View
              key={photo.uri}
              className="flex-row items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
            >
              <Text className="font-ui text-[14px] text-text">Foto {index + 1}</Text>
              <Text
                className={`font-ui text-[11px] uppercase tracking-[1px] ${STATUS_TEXT_COLORS[photo.status] ?? 'text-dim'}`}
              >
                {STATUS_LABELS[photo.status] ?? photo.status}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
