"use client"

import { CommandRows } from "../internal/rows"
import { useListPage } from "./use-list-page"
import type { ListPageProps } from "./use-list-page"

/**
 * The list of commands as a component: filtered by the input, keyboard-
 * navigable, each row opening a page or running an action. A list is not a
 * kind of page — this is configured inside a page's `render` like any other
 * body:
 *
 *   const menu: Page = { id: "menu", render: () => <ListPage items={…} /> }
 *
 * It is assembled from the public hooks only, so a page that wants more than
 * this can do everything it does.
 */
export function ListPage(props: ListPageProps) {
  const { sections, isEmpty, emptyMessage, note, listProps } =
    useListPage(props)

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
        trailing={props.trailing ?? "auto"}
      />
    </div>
  )
}
