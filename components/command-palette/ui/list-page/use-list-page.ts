"use client"

import { resolveCommand } from "../../core"
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
   * A line of prose above the rows. Part of the list, not the chrome: it sits
   * inside the list's own scroll box and scrolls with the rows. The header is
   * the frame's on every page — see `NoHeader`.
   */
  note?: (ctx: PageContext<Props, Result>) => React.ReactNode
}

export type AnyListConfig = ListPageConfig<unknown, unknown>

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
    note: ctx === null ? null : config.note?.(ctx),
    listProps: { ...list.listProps, "aria-label": config.title ?? "Commands" },
  }
}
