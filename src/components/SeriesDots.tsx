import { View } from 'react-native'

type SeriesDotsProps = {
  currentSet: number
  totalSets: number
}

/** Filled/hollow dot indicators for set progress. */
export function SeriesDots({ currentSet, totalSets }: SeriesDotsProps): React.JSX.Element {
  return (
    <View
      className="flex-row items-center gap-2"
      accessibilityLabel={`Série ${currentSet} de ${totalSets}`}
    >
      {Array.from({ length: totalSets }, (_, i) => {
        const setNumber = i + 1
        const isCompleted = setNumber < currentSet
        const isCurrent = setNumber === currentSet

        return (
          <View
            key={setNumber}
            className={`h-[6px] w-[32px] rounded-pill ${
              isCompleted ? 'bg-accent' : isCurrent ? 'bg-accent' : 'bg-surface-2'
            }`}
          />
        )
      })}
    </View>
  )
}
