import { View, Text, Image, Pressable } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import type { ImportPhotoStatus } from '@/types'

type ImportPhotoCardProps = {
  uri: string
  status: ImportPhotoStatus['status']
  onRemove: () => void
}

/** Status label map — Portuguese UI text. */
const STATUS_LABELS: Record<ImportPhotoStatus['status'], string> = {
  pending: 'PENDENTE',
  uploading: 'ENVIANDO',
  done: 'PRONTO',
  error: 'ERRO',
}

/** Status color map for the label badge. */
const STATUS_COLORS: Record<ImportPhotoStatus['status'], string> = {
  pending: 'bg-surface-2',
  uploading: 'bg-accent-dim',
  done: 'bg-accent-dim',
  error: 'bg-danger-dim',
}

/** Status text color map. */
const STATUS_TEXT_COLORS: Record<ImportPhotoStatus['status'], string> = {
  pending: 'text-muted',
  uploading: 'text-accent',
  done: 'text-accent',
  error: 'text-danger',
}

/** Card displaying a photo thumbnail with status indicator and remove button. */
export function ImportPhotoCard({
  uri,
  status,
  onRemove,
}: ImportPhotoCardProps): React.JSX.Element {
  const canRemove = status === 'pending' || status === 'error'

  return (
    <View className="relative h-[120px] w-[120px] overflow-hidden rounded-lg border border-border">
      {/* Thumbnail */}
      <Image
        source={{ uri }}
        accessibilityLabel="Foto do treino"
        className="h-full w-full"
        resizeMode="cover"
      />

      {/* Status badge */}
      <View className="absolute bottom-0 left-0 right-0 items-center pb-2">
        <View className={`rounded-pill px-2 py-0.5 ${STATUS_COLORS[status]}`}>
          <Text
            className={`font-ui text-[9px] uppercase tracking-[1px] ${STATUS_TEXT_COLORS[status]}`}
          >
            {STATUS_LABELS[status]}
          </Text>
        </View>
      </View>

      {/* Remove button — only for pending/error */}
      {canRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remover foto"
          onPress={onRemove}
          className="absolute right-1 top-1 h-[28px] w-[28px] items-center justify-center rounded-full bg-surface"
        >
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path
              d="M18 6L6 18M6 6l12 12"
              stroke="#8A8A8A"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      ) : null}
    </View>
  )
}
