"use client"

import { useEffect, useId, useLayoutEffect, useRef } from "react"
import type { RefObject } from "react"

import { filterItems } from "../filter"
import { claimEscape, matchesShortcut, resolveKey } from "../keymap"
import { edge, flatten, resolveActiveIndex, step } from "../list"
import type {
  FilteredGroup,
  ItemMeta,
  MatchedItem,
  Navigation,
  PageContext,
  PageDefinition,
  SetState,
} from "../types"
import { useInstanceId, usePaletteState, usePaletteStore } from "./context"

export function useNavigation(): Navigation {
  return usePaletteStore().navigation
}

/**
 * Typed context for the page a component lives in. The `page` argument is only
 * there to carry types — nothing is read from it at runtime.
 */
export function usePage<Props, State, Result, Component>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- inference only
  page: PageDefinition<Props, State, Result, Component>
): PageContext<Props, State, Result> & { isTop: boolean } {
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
    ...(ctx as unknown as PageContext<Props, State, Result>),
    isTop: top.instanceId === instanceId,
  }
}

export function usePageState<Props, State, Result, Component>(
  page: PageDefinition<Props, State, Result, Component>
): [State, SetState<State>] {
  const { state, setState } = usePage(page)
  return [state, setState]
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

/**
 * `useLayoutEffect` on the client, `useEffect` on the server. The palette is
 * mounted from first paint now, so a bare layout effect would warn in SSR.
 */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

/**
 * Ref for a page's scroll container, so its offset outlives being hidden.
 * A page keeps its React state while it is off screen, but the browser drops
 * the scroll position of a box it stopped laying out — this puts it back
 * before the next paint, so returning to a page looks like it never left.
 *
 * Effects, not the ref itself: hiding a page tears down its effects and
 * leaves the DOM node alone, so cleanup is the moment to record the offset
 * and the next run is the moment to restore it. The offset is written on the
 * way out rather than on every scroll event — a dispatch per frame would
 * re-render the page for a value nothing renders.
 */
export function useScrollRestore<
  T extends HTMLElement = HTMLDivElement,
>(): RefObject<T | null> {
  const store = usePaletteStore()
  const instanceId = useInstanceId()
  const ref = useRef<T | null>(null)

  useIsomorphicLayoutEffect(() => {
    const node = ref.current
    if (!node) return

    const instance = store
      .getState()
      .stack.find((entry) => entry.instanceId === instanceId)

    node.scrollTop = instance?.scrollTop ?? 0

    // Tracked in a closure, not in state: only the last value is ever read.
    let scrollTop = node.scrollTop
    const onScroll = () => {
      scrollTop = node.scrollTop
    }
    node.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      node.removeEventListener("scroll", onScroll)
      // A no-op once the instance is gone — see `mapInstance`.
      store.dispatch({ type: "setScrollTop", instanceId, scrollTop })
    }
  }, [store, instanceId])

  return ref
}

export type ItemProps = {
  id: string
  role: "option"
  "aria-selected": boolean
  "aria-disabled": true | undefined
  "data-index": number
  onMouseMove: () => void
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

/**
 * The list controller every list-shaped page shares: filtering, wraparound
 * keyboard nav that skips disabled rows, item shortcuts, and the aria wiring.
 * State lives in the store, so nothing here writes React state in an effect.
 *
 * Esc is not handled here — see the "escape" case below.
 */
export function useCommandList<T extends ItemMeta>(
  items: readonly T[],
  options: { onSelect?: (item: T, ctx: PageContext) => void } = {}
): CommandList<T> {
  const store = usePaletteStore()
  const instanceId = useInstanceId()
  const state = usePaletteState()
  const baseId = useId()

  const instance = state.stack.find((entry) => entry.instanceId === instanceId)
  const query = instance?.query ?? ""
  const activeItemId = instance?.activeItemId ?? null

  const groups = filterItems(items, query)
  const entries = flatten(groups)
  const activeIndex = resolveActiveIndex(entries, activeItemId)
  const activeItem = entries[activeIndex]?.item

  const optionId = (item: T) => `${baseId}-option-${item.id}`

  const setActiveIndex = (index: number) =>
    store.dispatch({
      type: "setActiveItem",
      instanceId,
      itemId: entries[index]?.item.id ?? null,
    })

  const { onSelect } = options

  const select = (index: number) => {
    const entry = entries[index]
    if (!entry || entry.item.disabled) return

    const ctx = store.contextFor(instanceId)
    if (!ctx) return

    onSelect?.(entry.item, ctx)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const intent = resolveKey(event)

    if (!intent) {
      const shortcutMatch = items.find(
        (item) =>
          item.shortcut &&
          !item.disabled &&
          matchesShortcut(item.shortcut, event)
      )
      if (shortcutMatch) {
        event.preventDefault()
        select(entries.findIndex((entry) => entry.item === shortcutMatch))
      }
      return
    }

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
        select(activeIndex)
        break
      case "escape":
        // Clears the input, or unwinds along this page's route — once. The
        // frame sees this same press on the way up and must not unwind again.
        event.preventDefault()
        if (claimEscape(event)) store.escape()
        break
    }
  }

  const getItemProps = (item: T, index: number): ItemProps => ({
    id: optionId(item),
    role: "option",
    "aria-selected": index === activeIndex,
    "aria-disabled": item.disabled || undefined,
    "data-index": index,
    // Mouse move, not enter: scrolling must not steal the selection.
    onMouseMove: () => {
      if (!item.disabled && index !== activeIndex) setActiveIndex(index)
    },
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
