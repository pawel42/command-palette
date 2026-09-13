import type { AnyPage, SearchMode } from "./types"

/** Only an editable input holds text that esc can clear. */
export function isEditable(search: SearchMode): boolean {
  return search === "filter" || search === "input"
}

/**
 * What the page's input does. Left out, it filters: a palette page is a list
 * unless it says otherwise, and the frame cannot see inside `render` to tell.
 * A page with fields of its own declares "disabled" or "hidden" — nothing
 * shifts on the way in, and nobody is invited to type into a box that filters
 * nothing.
 */
export function searchModeOf(page: AnyPage): SearchMode {
  return page.search ?? "filter"
}
