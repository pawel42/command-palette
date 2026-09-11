"use client"

import type { ComponentType } from "react"

import { definePage } from "../../core"
import type { PageDefinition } from "../../core"
import { CommandRows } from "../internal/rows"
import { useListPage } from "./use-list-page"
import type { AnyListConfig, ListPageConfig } from "./use-list-page"

export type { ListPageConfig }

/**
 * The one prebuilt page kind: a filtered, keyboard-navigable list whose items
 * either open a page or run an action. It is assembled from the public hooks
 * only — a hand-written page can do everything this does.
 */
export function listPage<Props = void, Result = void>(
  config: ListPageConfig<Props, Result>
): PageDefinition<Props, Result, ComponentType> {
  function ListPage() {
    return <ListPageView config={config as unknown as AnyListConfig} />
  }
  ListPage.displayName = `ListPage(${config.id})`

  return definePage<Props, Result, ComponentType>({
    id: config.id,
    title: config.title,
    search: config.search ?? "filter",
    placeholder: config.placeholder,
    escape: config.escape,
    // Tells the frame to offer the "↑↓ navigate / ↵ select" hints.
    list: true,
    footer: config.footer,
    component: ListPage,
  })
}

function ListPageView({ config }: { config: AnyListConfig }) {
  const { sections, isEmpty, emptyMessage, note, listProps } =
    useListPage(config)

  return (
    // --list-gap is the list's breathing room: its own padding, and the margin
    // every scrolled-to row and heading keeps from the edge of the scrollport.
    // h-full, not max-h: the frame's slot sets the height and this fills it, so
    // a list of two rows leaves the palette exactly as tall as a list of forty.
    <div className="h-full overflow-y-auto overscroll-contain p-(--list-gap) [--list-gap:--spacing(1.5)]">
      {note}

      <CommandRows
        sections={sections}
        isEmpty={isEmpty}
        emptyMessage={emptyMessage}
        listProps={listProps}
        // A page's rows say what section they are in, not what keys run them.
        trailing="label"
      />
    </div>
  )
}
