import { normalizeQuery, scoreItem } from "./fuzzy"
import type { FilteredGroup, ListItemLike } from "./types"

/**
 * Groups items under their headings — a row's `group` where it has one, and
 * its `section` otherwise — keeping headings in first-appearance order. With a
 * query present, items are re-ranked inside their heading; without one they
 * stay in source order.
 */
export function filterItems<T extends ListItemLike>(
  items: readonly T[],
  query: string
): FilteredGroup<T>[] {
  const normalized = normalizeQuery(query)
  const groups: FilteredGroup<T>[] = []
  const byHeading = new Map<string | undefined, FilteredGroup<T>>()

  items.forEach((item, order) => {
    const match = scoreItem(item, normalized)
    if (!match) return

    const heading = item.group ?? item.section

    let group = byHeading.get(heading)
    if (!group) {
      group = { heading, items: [] }
      byHeading.set(heading, group)
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
