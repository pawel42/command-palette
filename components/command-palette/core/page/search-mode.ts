import { isListPage } from "./target"
import type { AnyPage, SearchMode } from "./types"

/** Only an editable input holds text that esc can clear. */
export function isEditable(search: SearchMode): boolean {
  return search === "filter" || search === "input"
}

/**
 * What the page's input does, defaulting to the kind of page it is: a list is
 * filtered by the input, and a page with a body of its own gets the same row
 * with the typing switched off — nothing shifts on the way in, and nobody is
 * invited to type into a box that filters nothing.
 */
export function searchModeOf(page: AnyPage): SearchMode {
  return page.search ?? (isListPage(page) ? "filter" : "disabled")
}
