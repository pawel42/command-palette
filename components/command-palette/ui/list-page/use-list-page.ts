"use client"

import { useSyncExternalStore } from "react"

import type {
  Command,
  EscapeRoute,
  FooterInput,
  NoHeader,
  PageContext,
  SearchMode,
} from "../../core"
import {
  useCommandList,
  useInstanceId,
  usePaletteState,
  usePaletteStore,
} from "../../react"

import { usePublishBridge } from "../internal/bridge"
import type { ListRow, ListSection } from "../internal/rows"

export type ListPageConfig<Props, Result> = NoHeader & {
  id: string
  title?: string
  placeholder?: string
  search?: SearchMode
  escape?: EscapeRoute
  emptyMessage?: string
  /** Static, or derived from the page's props. */
  items: Command[] | ((ctx: PageContext<Props, Result>) => Command[])
  /** Handed straight to `definePage` — see `PageDefinition.footer`. */
  footer?: FooterInput<Props, Result>
  /**
   * For items that come from a store outside React — a recents list, a cache.
   * The page only subscribes to the palette's own state, so without this a
   * write out there would not reach the rows until the next keystroke did.
   */
  watch?: ExternalStore
  /**
   * A line of prose above the rows. Part of the list, not the chrome: it sits
   * inside the list's own scroll box and scrolls with the rows. The header is
   * the frame's on every page — see `NoHeader`.
   */
  note?: (ctx: PageContext<Props, Result>) => React.ReactNode
}

/** The `useSyncExternalStore` pair, named so a config can carry it. */
export type ExternalStore = {
  subscribe: (onChange: () => void) => () => void
  getSnapshot: () => unknown
}

export type AnyListConfig = ListPageConfig<unknown, unknown>

// Module constants, so the no-watch case hands `useSyncExternalStore` the same
// two references on every render and never resubscribes.
const NEVER = () => () => {}
const NOTHING = () => null

/** Both shapes are the shared renderer's — re-exported for the page kind. */
export type { ListRow, ListSection }

/**
 * Turns a list page's config into a view model: the filtered sections with
 * their rows already resolved, plus the key handling published to the frame.
 */
export function useListPage(config: AnyListConfig) {
  const store = usePaletteStore()
  const instanceId = useInstanceId()
  // Subscribes this page to the store, so query and selection changes re-render it.
  usePaletteState()
  // And to whatever else the items are built from.
  useSyncExternalStore(
    config.watch?.subscribe ?? NEVER,
    config.watch?.getSnapshot ?? NOTHING,
    config.watch?.getSnapshot ?? NOTHING
  )

  const ctx = store.contextFor(instanceId)
  const items =
    ctx === null
      ? []
      : typeof config.items === "function"
        ? config.items(ctx)
        : config.items

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
    emptyMessage: config.emptyMessage ?? "No results found.",
    note: ctx === null ? null : config.note?.(ctx),
    listProps: { ...list.listProps, "aria-label": config.title ?? "Commands" },
  }
}
