"use client"

import { useCallback, useId } from "react"

import type { ItemMeta } from "../core/command"
import {
  claimEscape,
  resolveKey,
  resolveShortcut,
  warnBrowserReserved,
} from "../core/keys"
import {
  edge,
  filterItems,
  flatten,
  resolveActiveIndex,
  step,
} from "../core/list"
import type { FilteredGroup, MatchedItem } from "../core/list"
import type { Navigation, Page, PageContext } from "../core/page"
import { useInstanceId, usePaletteState, usePaletteStore } from "./context"

export function useNavigation(): Navigation {
  return usePaletteStore().navigation
}

/**
 * Typed context for the page a component lives in. The `page` argument is only
 * there to carry types — nothing is read from it at runtime.
 */
export function usePage<Props, Result>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- inference only
  page: Page<Props, Result>
): PageContext<Props, Result> & { isTop: boolean } {
  const store = usePaletteStore()
  const instanceId = useInstanceId()
  const state = usePaletteState()

  // Rebuilt every render on purpose: the context closes over the store's
  // current snapshot, and `state` above is what makes the render happen.
  const ctx = store.contextFor(instanceId)
  if (!ctx) {
    throw new Error(`Page instance ${instanceId} is no longer on the stack`)
  }

  const top = state.stack[state.stack.length - 1]

  return {
    ...(ctx as unknown as PageContext<Props, Result>),
    isTop: top.instanceId === instanceId,
  }
}

/** The frame's input, bound to the current page. */
export function useSearch(): [string, (query: string) => void] {
  const store = usePaletteStore()
  const instanceId = useInstanceId()
  const state = usePaletteState()

  const instance = state.stack.find((entry) => entry.instanceId === instanceId)

  const setQuery = (query: string) =>
    store.dispatch({ type: "setQuery", instanceId, query })

  return [instance?.query ?? "", setQuery]
}

export type ItemProps = {
  id: string
  role: "option"
  "aria-selected": boolean
  "data-index": number
  /** Only the active row gets one: it scrolls itself back into view. */
  ref?: (node: HTMLElement | null) => void
  onClick: () => void
}

export type CommandList<T> = {
  groups: FilteredGroup<T>[]
  entries: MatchedItem<T>[]
  activeIndex: number
  activeItem: T | undefined
  /** For the input's `aria-activedescendant`. */
  activeOptionId: string | undefined
  listProps: { id: string; role: "listbox" }
  getItemProps: (item: T, index: number) => ItemProps
  onKeyDown: (event: React.KeyboardEvent) => void
  select: (index: number) => void
}

export type ListControl<T> = {
  /** What to filter by. */
  query: string
  /** The row the keyboard is on, by id. */
  activeItemId: string | null
  setActiveItemId: (itemId: string | null) => void
  onSelect?: (item: T, ctx: PageContext) => void
  /**
   * What esc does here. The default is the palette's own rule — clear the
   * input, or unwind — which is right for a page and wrong for anything that
   * merely sits on top of one, like the footer's action panel.
   */
  onEscape?: (event: React.KeyboardEvent) => void
}

/**
 * The list controller: filtering, wraparound keyboard nav, item shortcuts,
 * and the aria wiring. Where the query and the selection are kept is the
 * caller's business — `useCommandList` below keeps them in the store, and the
 * action panel keeps its own in React state, because its text is not the
 * page's text.
 */
export function useListController<T extends ItemMeta>(
  items: readonly T[],
  control: ListControl<T>
): CommandList<T> {
  const store = usePaletteStore()
  const instanceId = useInstanceId()
  const baseId = useId()

  const { query, activeItemId } = control

  // Development only, once per chord: a shortcut the browser owns is a
  // shortcut that silently does nothing.
  warnBrowserReserved(items)

  const groups = filterItems(items, query)
  const entries = flatten(groups)
  const activeIndex = resolveActiveIndex(entries, activeItemId)
  const activeItem = entries[activeIndex]?.item

  const optionId = (item: T) => `${baseId}-option-${item.id}`

  const setActiveIndex = (index: number) =>
    control.setActiveItemId(entries[index]?.item.id ?? null)

  // A ref, not an effect: the callback runs exactly when the active row
  // changes, which is the only moment there is anything to scroll to.
  const reveal = useCallback((node: HTMLElement | null) => {
    if (!node) return

    node.scrollIntoView({ block: "nearest" })

    // A row that opens a group brings the group's heading along — that being
    // whatever sits directly above it that isn't another option. Revealed
    // after the row and with "nearest" as well, so it does nothing unless the
    // heading is actually cut off, and nothing here has to know how tall it is.
    const heading = node.previousElementSibling
    if (heading && heading.getAttribute("role") !== "option") {
      heading.scrollIntoView({ block: "nearest" })
    }
  }, [])

  const { onSelect } = control

  const select = (index: number) => {
    const entry = entries[index]
    if (!entry) return

    const ctx = store.contextFor(instanceId)
    if (!ctx) return

    onSelect?.(entry.item, ctx)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    // Before the intents, not after: while a sequence is half-pressed the
    // palette is waiting for one specific key, and ↵ or an arrow may well be
    // the key it is waiting for.
    const outcome = resolveShortcut(items, event, {
      // The frame sees this press after we do, and its footer may hold the
      // other half of the sequence — so a miss here is not a cancel.
      final: false,
    })

    if (outcome.type === "miss") return

    if (outcome.type !== "none") {
      // Spent here whatever it turned out to mean — a press that opens or
      // ends a sequence must not also reach the input behind it.
      event.preventDefault()

      // Held, not pressed: one chord is one command, the way it is for the
      // frame's own actions. Still spent, though — the first press ran the
      // thing, and letting the autorepeats through would type the shortcut's
      // own key into the input behind it.
      if (event.repeat) return

      if (outcome.type === "run") {
        select(entries.findIndex((entry) => entry.item === outcome.item))
      }
      return
    }

    const intent = resolveKey(event)
    if (!intent) return

    switch (intent.type) {
      case "move":
        event.preventDefault()
        setActiveIndex(step(entries, activeIndex, intent.direction))
        break
      case "edge":
        event.preventDefault()
        setActiveIndex(edge(entries, intent.edge, activeIndex))
        break
      case "select":
        event.preventDefault()
        // The same rule, for the key most likely to be leant on: a finger left
        // on ↵ is one press that is still happening, not sixty of them, and
        // sixty of them would be sixty runs of whatever the row does. Only the
        // keys that *run* something are held to this — the arrows above repeat
        // on purpose, because holding ↓ is how a long list is walked.
        if (!event.repeat) select(activeIndex)
        break
      case "escape":
        // Clears the input, or unwinds along this page's route — once. The
        // frame sees this same press on the way up and must not unwind again.
        event.preventDefault()
        if (control.onEscape) control.onEscape(event)
        else if (claimEscape(event)) store.escape()
        break
    }
  }

  const getItemProps = (item: T, index: number): ItemProps => ({
    id: optionId(item),
    role: "option",
    "aria-selected": index === activeIndex,
    "data-index": index,
    ref: index === activeIndex ? reveal : undefined,
    // The pointer never moves the selection: hovering only paints a row (see
    // the row's hover style), so the arrow keys always resume from wherever
    // the keyboard left off rather than from wherever the cursor happens to
    // rest. A click still runs the row it is over, active or not.
    onClick: () => select(index),
  })

  return {
    groups,
    entries,
    activeIndex,
    activeItem,
    activeOptionId: activeItem ? optionId(activeItem) : undefined,
    listProps: { id: `${baseId}-list`, role: "listbox" },
    getItemProps,
    onKeyDown,
    select,
  }
}

/**
 * The controller every list-shaped *page* uses: the same thing, with the query
 * and the selection kept in the store under this page's instance. State lives
 * there, so nothing here writes React state in an effect, and a page keeps its
 * text and its row when it is navigated away from.
 */
export function useCommandList<T extends ItemMeta>(
  items: readonly T[],
  options: { onSelect?: (item: T, ctx: PageContext) => void } = {}
): CommandList<T> {
  const store = usePaletteStore()
  const instanceId = useInstanceId()
  // Subscribes to the store, so a query or selection change re-renders.
  const state = usePaletteState()

  const instance = state.stack.find((entry) => entry.instanceId === instanceId)

  return useListController(items, {
    query: instance?.query ?? "",
    activeItemId: instance?.activeItemId ?? null,
    setActiveItemId: (itemId) =>
      store.dispatch({ type: "setActiveItem", instanceId, itemId }),
    onSelect: options.onSelect,
  })
}
