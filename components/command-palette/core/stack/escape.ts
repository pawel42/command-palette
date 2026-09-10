import { isEditable } from "../page/search-mode"
import type { EscapeRoute } from "../page/types"
import type { PageInstance, PaletteState } from "./types"

export type EscapeOutcome =
  | { type: "clearQuery"; instanceId: string }
  | { type: "pop" }
  | { type: "unwindTo"; instanceId: string }
  | { type: "dismiss" }

/** Push-site override wins over the page's own route; default is one level. */
export function escapeRouteOf(instance: PageInstance): EscapeRoute {
  return instance.escape ?? instance.page.escape ?? "back"
}

/**
 * The whole esc rule in one pure function:
 *
 *   input is editable and has text              -> clear it
 *   at the root with an empty input             -> dismiss
 *   route "back"                                -> drop the top instance
 *   route "root"                                -> unwind to the root
 *   route { to }                                -> unwind to that page, else "back"
 */
export function resolveEscape(state: PaletteState): EscapeOutcome {
  const top = state.stack[state.stack.length - 1]

  if (isEditable(top.page.search) && top.query !== "") {
    return { type: "clearQuery", instanceId: top.instanceId }
  }

  if (state.stack.length === 1) return { type: "dismiss" }

  const route = escapeRouteOf(top)

  if (route === "back") return { type: "pop" }

  if (route === "root") {
    return { type: "unwindTo", instanceId: state.stack[0].instanceId }
  }

  for (let index = state.stack.length - 2; index >= 0; index--) {
    if (state.stack[index].page === route.to) {
      return { type: "unwindTo", instanceId: state.stack[index].instanceId }
    }
  }

  // The requested page isn't on the stack — fall back to one level.
  return { type: "pop" }
}
