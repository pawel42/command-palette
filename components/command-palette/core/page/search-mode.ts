import type { AnyPage, SearchMode } from "./types"

/** Only a page that has the input holds text that esc can clear. */
export function isEditable(search: SearchMode): boolean {
  return search === "input"
}

/**
 * Whether the page has the input. Left out, it does: a palette page is
 * something you type into unless it says otherwise, and the frame cannot see
 * inside `render` to tell. A page with fields of its own declares "disabled" —
 * the row then carries the page's title, and nobody is invited to type into a
 * box that does nothing.
 */
export function searchModeOf(page: AnyPage): SearchMode {
  return page.search ?? "input"
}
