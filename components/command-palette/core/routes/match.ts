import type { PathPattern } from "./types"

/**
 * The path a rule is read against: no query, no hash, no trailing slash.
 * `usePathname` already hands over the first two; the third is a `next.config`
 * setting, and a rule written `"/admin"` must not stop matching because of it.
 */
export function normalizePath(path: string): string {
  const [clean = ""] = path.split(/[?#]/)
  const trimmed = clean.replace(/\/+$/, "")
  return trimmed || "/"
}

function segmentsOf(path: string): string[] {
  return path.split("/").filter(Boolean)
}

/** A route segment that stands for something: `[id]`, or `[...slug]`. */
const isDynamic = (segment: string) => segment.startsWith("[")
const isCatchAll = (segment: string) => segment.startsWith("[...")

/**
 * Does one rule — with its `!` already stripped — cover this path?
 *
 * A trailing `/*` means the subtree: the base itself and everything under it,
 * so `"/admin/*"` covers `/admin` as well as `/admin/users`. That is what
 * makes `"/*"` mean every path by the same rule rather than by a special case.
 * Anything else has to line up segment for segment.
 */
function covers(rule: string, path: string): boolean {
  const subtree = rule.endsWith("/*")
  const want = segmentsOf(subtree ? rule.slice(0, -2) : rule)
  const here = segmentsOf(path)

  // `"/docs/[...slug]"` is two segments against a path of any greater length.
  const openEnded = subtree || want.some(isCatchAll)
  if (openEnded ? here.length < want.length : here.length !== want.length) {
    return false
  }

  return want.every((segment, index) => {
    if (isCatchAll(segment)) return true
    if (isDynamic(segment)) return here[index] !== undefined
    return segment === here[index]
  })
}

/**
 * Is a command with these rules available on this path?
 *
 * Nothing is available by default: a command is off everywhere until a rule
 * says otherwise, which is why `"/*"` is written out rather than implied. The
 * **last** rule that covers the path is the one that decides, so a list reads
 * as a general case and then its exceptions:
 *
 *     ["/*", "!/admin/*"]            everywhere except the admin area
 *     ["/admin/*", "!/admin"]        under admin, but not its index
 *     ["!/*", "/settings"]           the long way round to `["/settings"]`
 *
 * A rule that covers nothing is simply never consulted, so order only matters
 * between rules that overlap.
 */
export function isAvailableOn(
  paths: readonly PathPattern[],
  path: string
): boolean {
  return decide(paths, normalizePath(path))
}

/** The same, against a path that has already been through `normalizePath`. */
function decide(paths: readonly PathPattern[], here: string): boolean {
  let available = false

  for (const pattern of paths) {
    const negated = pattern.startsWith("!")
    if (covers(negated ? pattern.slice(1) : pattern, here)) {
      available = !negated
    }
  }

  return available
}

/** The rows of a list that belong on this path, in the order they came. */
export function availableOn<T extends { paths: readonly PathPattern[] }>(
  items: readonly T[],
  path: string
): T[] {
  const here = normalizePath(path)
  return items.filter((item) => decide(item.paths, here))
}
