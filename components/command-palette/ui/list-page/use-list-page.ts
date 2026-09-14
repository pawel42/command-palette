"use client"

import { useSyncExternalStore } from "react"
import type { ReactNode } from "react"

import { availableOn } from "../../core"
import type { ExternalStore, ListCommand, PageContext } from "../../core"
import {
  useCommandList,
  useCurrentPath,
  useInstanceId,
  usePaletteState,
  usePaletteStore,
} from "../../react"

import { usePublishBridge } from "../internal/bridge"
import type { ListRow, ListSection, Trailing } from "../internal/rows"

/** What a `ListPage` is configured with, inside a page's `render`. */
export type ListPageProps = {
  /**
   * The rows: static, or a function of the page's context — the query and the
   * props, most of all. The function form runs on every render of the list,
   * so it may read anything outside React; `watch` is what tells the list
   * when that moved.
   */
  items: ListCommand[] | ((ctx: PageContext) => ListCommand[])
  emptyMessage?: string
  /**
   * A line of prose above the rows. Part of the list, not the chrome: it sits
   * inside the list's own scroll box and scrolls with the rows. The header is
   * the frame's on every page — see `NoHeader`.
   */
  note?: ReactNode
  /**
   * For items that come from a store outside React — a recents list, a cache.
   * The list only subscribes to the palette's own state, so without this a
   * write out there would not reach the rows until the next keystroke did.
   */
  watch?: ExternalStore
  /** What a screen reader calls the list. Defaults to the page's title. */
  label?: string
  /**
   * What the right edge of each row carries. Defaults to `"auto"`: the keys on
   * the rows that have them, the section on the rest — see `Trailing`.
   */
  trailing?: Trailing
}

// Module constants, so the no-watch case hands `useSyncExternalStore` the same
// two references on every render and never resubscribes.
const NEVER = () => () => {}
const NOTHING = () => null

/** All three are the shared renderer's — re-exported for the list's API. */
export type { ListRow, ListSection, Trailing }

/**
 * Turns the list's config into a view model: the filtered sections with their
 * rows already resolved, plus the key handling published to the frame.
 */
export function useListPage({
  items,
  emptyMessage,
  note,
  watch,
  label,
}: ListPageProps) {
  const store = usePaletteStore()
  const instanceId = useInstanceId()
  const path = useCurrentPath()
  // Subscribes this list to the store, so query and selection changes re-render it.
  const state = usePaletteState()
  // And to whatever else the items are built from.
  useSyncExternalStore(
    watch?.subscribe ?? NEVER,
    watch?.getSnapshot ?? NOTHING,
    watch?.getSnapshot ?? NOTHING
  )

  const ctx = store.contextFor(instanceId)
  const resolved =
    ctx === null ? [] : typeof items === "function" ? items(ctx) : items

  // Where the user is, applied before anything else looks at the rows — so a
  // command that does not exist here is not filtered, not counted towards
  // "no results", and not reachable by its own shortcut, which the controller
  // matches off this same array.
  const here = availableOn(resolved, path)

  const list = useCommandList(here, {
    // Through the store rather than straight to `resolveCommand`: it builds
    // the same context from the same instance, and it is the one place a host
    // watching for what ran gets to see it.
    onSelect: (item) => {
      void store.runCommand(item, instanceId)
    },
  })

  usePublishBridge({
    onKeyDown: list.onKeyDown,
    activeOptionId: list.activeOptionId,
    listId: list.listProps.id,
  })

  const indexById = new Map(
    list.entries.map((entry, index) => [entry.item.id, index])
  )

  const sections: ListSection[] = list.groups.map((group, groupIndex) => ({
    key: group.heading ?? `group-${groupIndex}`,
    heading: group.heading,
    headingId: group.heading
      ? `${list.listProps.id}-group-${groupIndex}`
      : undefined,
    rows: group.items.map(({ item, indices }) => {
      const index = indexById.get(item.id) ?? -1

      return {
        item,
        indices,
        isActive: index === list.activeIndex,
        props: list.getItemProps(item, index),
      }
    }),
  }))

  // The label falls back to the page the list is rendered on, read off the
  // stack — the list has no page object of its own to ask.
  const title = state.stack.find(
    (instance) => instance.instanceId === instanceId
  )?.page.title

  return {
    sections,
    isEmpty: list.entries.length === 0,
    emptyMessage: emptyMessage ?? "No results found.",
    note: note ?? null,
    listProps: {
      ...list.listProps,
      "aria-label": label ?? title ?? "Commands",
    },
  }
}
