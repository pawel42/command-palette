import type { PageInstance, PaletteState, SearchMode } from "./types"

export type Breadcrumb = { instanceId: string; title: string }

export type PaletteView = {
  instance: PageInstance
  /** 1 at the root. */
  depth: number
  isRoot: boolean
  /** Runtime path, not a declared hierarchy — esc always follows this. */
  breadcrumbs: Breadcrumb[]
  search: SearchMode
  placeholder?: string
  query: string
}

/**
 * Everything the frame needs, derived from state. Never call this inside
 * `getSnapshot` — it allocates, so `useSyncExternalStore` would loop. Wrap it
 * in `useMemo` keyed on the state object instead.
 */
export function selectView(state: PaletteState): PaletteView {
  const instance = state.stack[state.stack.length - 1]

  return {
    instance,
    depth: state.stack.length,
    isRoot: state.stack.length === 1,
    breadcrumbs: state.stack.map((entry) => ({
      instanceId: entry.instanceId,
      title: entry.page.title ?? entry.page.id,
    })),
    search: instance.page.search,
    placeholder: instance.page.placeholder,
    query: instance.query,
  }
}
