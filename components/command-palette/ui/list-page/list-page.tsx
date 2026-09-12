"use client"

import { CommandRows } from "../internal/rows"
import { useListPage } from "./use-list-page"
import type { AnyListPage } from "./use-list-page"

/**
 * The body of a page that declared `items`: a filtered, keyboard-navigable
 * list whose rows either open a page or run an action. The host writes no
 * component for it — `PageHost` renders this one — and it is assembled from
 * the public hooks only, so a page with a body of its own can do everything
 * this does.
 */
export function ListPageView({ page }: { page: AnyListPage }) {
  const { sections, isEmpty, emptyMessage, note, listProps } = useListPage(page)

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
