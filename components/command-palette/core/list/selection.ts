import type { FilteredGroup, MatchedItem } from "./types"

type NavEntry = { item: { id: string } }

export function flatten<T>(
  groups: readonly FilteredGroup<T>[]
): MatchedItem<T>[] {
  return groups.flatMap((group) => group.items)
}

/**
 * Active entry for a stored id. Falls back to the first entry, so an item
 * that filters out never leaves the list without a selection.
 */
export function resolveActiveIndex(
  entries: readonly NavEntry[],
  activeItemId: string | null
): number {
  if (activeItemId !== null) {
    const index = entries.findIndex((entry) => entry.item.id === activeItemId)
    if (index !== -1) return index
  }

  return 0
}

/** Next index in `direction`, wrapping around. */
export function step(
  entries: readonly unknown[],
  from: number,
  direction: 1 | -1
): number {
  const total = entries.length
  if (total === 0) return from

  return (((from + direction) % total) + total) % total
}

/** First or last index; `from` is returned when there are no entries. */
export function edge(
  entries: readonly unknown[],
  which: "first" | "last",
  from = 0
): number {
  if (entries.length === 0) return from

  return which === "first" ? 0 : entries.length - 1
}
