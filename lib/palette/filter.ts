import { normalizeQuery, scoreItem } from "./fuzzy"
import type { FilteredGroup, ListItemLike } from "./types"

/**
 * Groups items by section, keeping sections in first-appearance order. With a
 * query present, items are re-ranked inside their section; without one they
 * stay in source order.
 */
export function filterItems<T extends ListItemLike>(
  items: readonly T[],
  query: string
): FilteredGroup<T>[] {
  const normalized = normalizeQuery(query)
  const groups: FilteredGroup<T>[] = []
  const bySection = new Map<string | undefined, FilteredGroup<T>>()

  items.forEach((item, order) => {
    const match = scoreItem(item, normalized)
    if (!match) return

    let group = bySection.get(item.section)
    if (!group) {
      group = { section: item.section, items: [] }
      bySection.set(item.section, group)
      groups.push(group)
    }

    group.items.push({
      item,
      // The tiny order term keeps equal scores in source order.
      score: match.score - order * 1e-6,
      indices: match.indices,
    })
  })

  if (normalized) {
    for (const group of groups) group.items.sort((a, b) => b.score - a.score)
  }

  return groups
}
