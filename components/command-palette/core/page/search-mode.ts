import type { SearchMode } from "./types"

/** Only an editable input holds text that esc can clear. */
export function isEditable(search: SearchMode): boolean {
  return search === "filter" || search === "input"
}
