"use client"

import { formatChords } from "../../core"
import type { Command } from "../../core"
import type { ItemProps } from "../../react"
import { usePlatform } from "../../react"
import { Highlight, Kbd } from "../primitives"

/** One rendered row: everything the markup needs, nothing it has to derive. */
export type ListRow = {
  item: Command
  indices: readonly number[]
  isActive: boolean
  props: ItemProps
}

/**
 * What the right edge of a row carries: the keys that run it, or the section
 * it belongs to.
 *
 * `"auto"` is what a list page wants and is its default — the keys on the rows
 * that have keys, and the section on the rest. A row with a shortcut has
 * something to teach; a row without one only has somewhere it lives, and under
 * a heading that already says so, repeating it is the noise. The action panel
 * forces `"shortcut"`, which is the whole point of it.
 *
 * Whatever is drawn, the shortcut still *works*: it is matched off the item,
 * not off what was drawn — see `useListController`'s key handler.
 */
export type Trailing = "shortcut" | "label" | "auto"

export type ListSection = {
  key: string
  /** What the heading says — a row's `group` where it has one, else its section. */
  heading?: string
  headingId?: string
  rows: ListRow[]
}

/**
 * The listbox: sections, their headings, and the rows in them.
 *
 * Shared by the one prebuilt page kind and by the footer's action panel,
 * because both are the same thing — a filtered list of commands with one of
 * them active — and because the rules encoded in the row's classes below are
 * not rules worth keeping two copies of.
 *
 * The scroll box and the `--list-gap` it pairs with belong to the caller: the
 * panel is a tighter list than a page is.
 */
export function CommandRows({
  sections,
  isEmpty,
  emptyMessage,
  listProps,
  trailing = "shortcut",
}: {
  sections: ListSection[]
  isEmpty: boolean
  emptyMessage: string
  listProps: { id: string; role: "listbox"; "aria-label"?: string }
  /** What the right edge of a row carries — see `CommandRow`. */
  trailing?: Trailing
}) {
  return (
    <div {...listProps}>
      {isEmpty ? (
        <p className="px-2 py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        sections.map((section) => (
          <div
            key={section.key}
            role="group"
            aria-labelledby={section.headingId}
            className="mb-1 last:mb-0"
          >
            {section.heading && (
              <div
                id={section.headingId}
                className="scroll-mt-(--list-gap) px-2 pt-2 pb-1.5 text-xs font-medium text-muted-foreground"
              >
                {section.heading}
              </div>
            )}

            {section.rows.map((row) => (
              <CommandRow key={row.item.id} row={row} trailing={trailing} />
            ))}
          </div>
        ))
      )}
    </div>
  )
}

export function CommandRow({
  row,
  trailing = "shortcut",
}: {
  row: ListRow
  trailing?: Trailing
}) {
  const { item, indices, isActive } = row
  const platform = usePlatform()
  // "auto" is the one that decides per row: keys where there are keys.
  const shows = trailing === "auto" ? (item.shortcut ? "shortcut" : "label") : trailing

  return (
    <div
      {...row.props}
      className={[
        "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm select-none",
        // Keeps the row clear of the scrollport edge when it scrolls itself in.
        "scroll-my-(--list-gap)",
        // Hover paints, it does not select: the cursor gets a dimmer wash so
        // the keyboard's row stays the one that reads as chosen. The active
        // row is left alone, or passing over it would look like a downgrade.
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-foreground hover:bg-accent/60",
      ].join(" ")}
    >
      {item.icon && (
        <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
          {item.icon}
        </span>
      )}

      <span className="min-w-0 flex-1 truncate">
        <Highlight text={item.title} indices={indices} />
        {item.description && (
          <span className="ml-2 text-xs text-muted-foreground">
            {item.description}
          </span>
        )}
      </span>

      {/* One group per press: ⌘D then L reads as two presses, with air
          between them, not as four keys held at once. */}
      {shows === "shortcut" && item.shortcut && (
        <span className="flex shrink-0 items-center gap-2">
          {formatChords(item.shortcut, platform).map((chord, index) => (
            <span key={index} className="flex items-center gap-1">
              {chord.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </span>
          ))}
        </span>
      )}

      {/* Where the row lives, which is not always the heading it is under: a
          row copied into "Recent" still says "Pages" here. */}
      {shows === "label" && item.section && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {item.section}
        </span>
      )}
    </div>
  )
}
