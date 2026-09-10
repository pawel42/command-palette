import type { ListItemLike, Match } from "./types"

/**
 * Subsequence match with bonuses for prefix, word-boundary and consecutive
 * hits, and a penalty for skipped characters. Returns null when the query is
 * not a subsequence of the text.
 */
export function fuzzyMatch(text: string, query: string): Match | null {
  if (!query) return { score: 0, indices: [] }

  const haystack = text.toLowerCase()
  const indices: number[] = []
  let score = 0
  let from = 0
  let previous = -2

  for (const char of query) {
    const index = haystack.indexOf(char, from)
    if (index === -1) return null

    if (index === previous + 1) score += 10
    if (index === 0) score += 16
    else if (/[\s\-_/.:]/.test(haystack[index - 1])) score += 8

    score -= Math.min(index - from, 8)

    indices.push(index)
    previous = index
    from = index + 1
  }

  // Shorter titles win when the match is otherwise equal.
  return { score: score - text.length * 0.1, indices }
}

/** Title first; keywords rank below any title hit and highlight nothing. */
export function scoreItem(item: ListItemLike, query: string): Match | null {
  const direct = fuzzyMatch(item.title, query)
  if (direct) return direct

  for (const keyword of item.keywords ?? []) {
    const match = fuzzyMatch(keyword, query)
    if (match) return { score: match.score - 40, indices: [] }
  }

  return null
}

/** Whitespace is meaningless in a palette query, so "op fi" matches "open file". */
export function normalizeQuery(query: string): string {
  return query.replace(/\s+/g, "").toLowerCase()
}
