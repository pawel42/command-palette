"use client"

import { resolveCommand } from "@/lib/palette"
import type {
  Command,
  EscapeRoute,
  PageContext,
  SearchMode,
} from "@/lib/palette"
import type { ItemProps } from "@/lib/palette/react"
import {
  useCommandList,
  useInstanceId,
  usePaletteState,
  usePaletteStore,
} from "@/lib/palette/react"

import { usePublishBridge } from "./bridge"

export type ListPageConfig<Props, State, Result> = {
  id: string
  title?: string
  placeholder?: string
  search?: SearchMode
  escape?: EscapeRoute
  emptyMessage?: string
  initialState?: (props: Props) => State
  load?: (ctx: PageContext<Props, State, Result>) => void | Promise<void>
  /** Static, or derived from the page's props and state. */
  items: Command[] | ((ctx: PageContext<Props, State, Result>) => Command[])
  /** Optional note above the list. */
  header?: (ctx: PageContext<Props, State, Result>) => React.ReactNode
}

export type AnyListConfig = ListPageConfig<unknown, unknown, unknown>

/** One rendered row: everything the markup needs, nothing it has to derive. */
export type ListRow = {
  item: Command
  indices: readonly number[]
  isActive: boolean
  props: ItemProps
}

export type ListSection = {
  key: string
  section?: string
  headingId?: string
  rows: ListRow[]
}

/**
 * Turns a list page's config into a view model: the filtered sections with
 * their rows already resolved, plus the key handling published to the frame.
 */
export function useListPage(config: AnyListConfig) {
  const store = usePaletteStore()
  const instanceId = useInstanceId()
  // Subscribes this page to the store, so state and query changes re-render it.
  usePaletteState()

  const ctx = store.contextFor(instanceId)
  const items =
    ctx === null
      ? []
      : typeof config.items === "function"
        ? config.items(ctx)
        : config.items

  const list = useCommandList(items, {
    onSelect: (item, itemCtx) => {
      void resolveCommand(item, itemCtx)
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
    header: ctx === null ? null : config.header?.(ctx),
    listProps: { ...list.listProps, "aria-label": config.title ?? "Commands" },
  }
}
