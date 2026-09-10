/** Minimum an item needs to be filtered and navigated. */
export type ListItemLike = {
  id: string
  title: string
  section?: string
  keywords?: readonly string[]
  disabled?: boolean
}

export type Match = {
  score: number
  /** Indices in the title that matched, for highlighting. */
  indices: readonly number[]
}

export type MatchedItem<T> = {
  item: T
  score: number
  indices: readonly number[]
}

export type FilteredGroup<T> = { section?: string; items: MatchedItem<T>[] }
