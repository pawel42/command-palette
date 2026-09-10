import type { AnyPage } from "@/lib/palette"

/**
 * Which page definitions render a keyboard-navigable list. The frame needs
 * this to decide whether "↑↓ navigate" applies, and it must be known at
 * definition time — deriving it from the mounted page would mean an effect,
 * and the footer would flicker on first paint.
 */
const listPages = new WeakSet<AnyPage>()

export function markListPage<T extends AnyPage>(page: T): T {
  listPages.add(page)
  return page
}

export function isListPage(page: AnyPage): boolean {
  return listPages.has(page)
}
