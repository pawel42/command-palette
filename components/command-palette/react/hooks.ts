"use client"

import { useCallback, useId, useRef } from "react"

import type { ItemMeta } from "../core/command"
import { claimEscape, matchesShortcut, resolveKey } from "../core/keys"
import {
  edge,
  filterItems,
  flatten,
  resolveActiveIndex,
  step,
} from "../core/list"
import type { FilteredGroup, MatchedItem } from "../core/list"
import type { Navigation, PageContext, PageDefinition } from "../core/page"
import { useInstanceId, usePaletteState, usePaletteStore } from "./context"

export function useNavigation(): Navigation {
  return usePaletteStore().navigation
}

/**
 * Typed context for the page a component lives in. The `page` argument is only
 * there to carry types — nothing is read from it at runtime.
 */
export function usePage<Props, Result, Component>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- inference only
  page: PageDefinition<Props, Result, Component>
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
  "aria-disabled": true | undefined
  "data-index": number
  /** Only the active row gets one: it scrolls itself back into view. */
  ref?: (node: HTMLElement | null) => void
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

  // Set by the pointer, cleared by the reveal below: hovering a half-visible
  // row must not scroll it, or the list would crawl away under the cursor.
  const pointerDriven = useRef(false)

  // A ref, not an effect: the callback runs exactly when the active row
  // changes, which is the only moment there is anything to scroll to.
  const reveal = useCallback((node: HTMLElement | null) => {
    if (!node) return
    if (pointerDriven.current) {
      pointerDriven.current = false
      return
    }

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
    ref: index === activeIndex ? reveal : undefined,
    // Mouse move, not enter: scrolling must not steal the selection.
    onMouseMove: () => {
      if (item.disabled || index === activeIndex) return
      pointerDriven.current = true
      setActiveIndex(index)
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
