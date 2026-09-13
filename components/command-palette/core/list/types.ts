/** Minimum an item needs to be filtered and navigated. */
export type ListItemLike = {
  id: string
  title: string
  section?: string
  /** The heading to file this item under, when it is not its section. */
  group?: string
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

/** One heading and the items under it. The heading may be a `group`, so it is
 *  not called a section: see `ItemMeta.group`. */
export type FilteredGroup<T> = { heading?: string; items: MatchedItem<T>[] }
