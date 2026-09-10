import type { FilteredGroup, MatchedItem } from "./types"

type NavEntry = { item: { id: string; disabled?: boolean } }

export function flatten<T>(
  groups: readonly FilteredGroup<T>[]
): MatchedItem<T>[] {
  return groups.flatMap((group) => group.items)
}

export function isSelectable(entry: NavEntry): boolean {
  return !entry.item.disabled
}

/** Index of the first selectable entry, or -1. */
export function firstSelectable(entries: readonly NavEntry[]): number {
  return entries.findIndex(isSelectable)
}

/**
 * Active entry for a stored id. Falls back to the first selectable entry, so
 * an item that filters out never leaves the list without a selection.
 */
export function resolveActiveIndex(
  entries: readonly NavEntry[],
  activeItemId: string | null
): number {
  if (activeItemId !== null) {
    const index = entries.findIndex(
      (entry) => entry.item.id === activeItemId && isSelectable(entry)
    )
    if (index !== -1) return index
  }

  return Math.max(firstSelectable(entries), 0)
}

/** Next selectable index in `direction`, wrapping around; disabled skipped. */
export function step(
  entries: readonly NavEntry[],
  from: number,
  direction: 1 | -1
): number {
  const total = entries.length
  if (total === 0 || !entries.some(isSelectable)) return from

  for (let offset = 1; offset <= total; offset++) {
    const next = (((from + direction * offset) % total) + total) % total
    if (isSelectable(entries[next])) return next
  }

  return from
}

/** First or last selectable index; `from` is returned when there is none. */
export function edge(
  entries: readonly NavEntry[],
  which: "first" | "last",
  from = 0
): number {
  const indices = entries.map((_, index) => index)
  if (which === "last") indices.reverse()

  const found = indices.find((index) => isSelectable(entries[index]))
  return found ?? from
}
