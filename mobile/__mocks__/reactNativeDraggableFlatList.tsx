import React from 'react'
import { FlatList } from 'react-native'

type RenderParams<T> = {
  item: T
  index: number
  drag: () => void
  isActive: boolean
  getIndex: () => number | undefined
}

type DraggableFlatListProps<T> = {
  data: T[]
  keyExtractor?: (item: T, index: number) => string
  renderItem: (params: RenderParams<T>) => React.ReactElement | null
}

export type RenderItemParams<T> = RenderParams<T>

export function ScaleDecorator({ children }: { children: React.ReactNode }): React.ReactElement {
  return <>{children}</>
}

export default function DraggableFlatList<T>({
  data,
  keyExtractor,
  renderItem,
}: DraggableFlatListProps<T>): React.ReactElement {
  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={({ item, index }) =>
        renderItem({
          item,
          index,
          drag: () => undefined,
          isActive: false,
          getIndex: () => index,
        })
      }
    />
  )
}
