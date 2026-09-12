"use client"

import { useSyncExternalStore } from "react"

import type { ListPage } from "../../core"
import {
  useCommandList,
  useInstanceId,
  usePaletteState,
  usePaletteStore,
} from "../../react"

import { usePublishBridge } from "../internal/bridge"
import type { ListRow, ListSection } from "../internal/rows"

/** A list page with its types erased — what the renderer works with. */
export type AnyListPage = ListPage<unknown, unknown>

// Module constants, so the no-watch case hands `useSyncExternalStore` the same
// two references on every render and never resubscribes.
const NEVER = () => () => {}
const NOTHING = () => null

/** Both shapes are the shared renderer's — re-exported for the page kind. */
export type { ListRow, ListSection }

/**
 * Turns a list page into a view model: the filtered sections with their rows
 * already resolved, plus the key handling published to the frame.
 */
export function useListPage(page: AnyListPage) {
  const store = usePaletteStore()
  const instanceId = useInstanceId()
  // Subscribes this page to the store, so query and selection changes re-render it.
  usePaletteState()
  // And to whatever else the items are built from.
  useSyncExternalStore(
    page.watch?.subscribe ?? NEVER,
    page.watch?.getSnapshot ?? NOTHING,
    page.watch?.getSnapshot ?? NOTHING
  )

  const ctx = store.contextFor(instanceId)
  const items =
    ctx === null
      ? []
      : typeof page.items === "function"
        ? page.items(ctx)
        : page.items

  const list = useCommandList(items, {
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
    key: group.section ?? `group-${groupIndex}`,
    section: group.section,
    headingId: group.section
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

  return {
    sections,
    isEmpty: list.entries.length === 0,
    emptyMessage: page.emptyMessage ?? "No results found.",
    note: ctx === null ? null : page.note?.(ctx),
    listProps: { ...list.listProps, "aria-label": page.title ?? "Commands" },
  }
}
