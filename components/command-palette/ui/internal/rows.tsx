"use client"

import type { Command } from "../../core"
import type { ItemProps } from "../../react"
import { Highlight, ICONS, Icon, Kbd } from "../primitives"

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
}: {
  sections: ListSection[]
  isEmpty: boolean
  emptyMessage: string
  listProps: { id: string; role: "listbox"; "aria-label"?: string }
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
            {section.section && (
              <div
                id={section.headingId}
                className="scroll-mt-(--list-gap) px-2 pt-2 pb-1.5 text-xs font-medium text-muted-foreground"
              >
                {section.section}
              </div>
            )}

            {section.rows.map((row) => (
              <CommandRow key={row.item.id} row={row} />
            ))}
          </div>
        ))
      )}
    </div>
  )
}

export function CommandRow({ row }: { row: ListRow }) {
  const { item, indices, isActive } = row

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
        item.disabled ? "pointer-events-none opacity-40" : "",
      ].join(" ")}
    >
      {item.icon && (
        <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
          {item.icon}
        </span>
      )}

      <span className="min-w-0 flex-1 truncate">
        <Highlight text={item.title} indices={indices} />
        {item.subtitle && (
          <span className="ml-2 text-xs text-muted-foreground">
            {item.subtitle}
          </span>
        )}
      </span>

      {item.shortcut && (
        <span className="flex shrink-0 items-center gap-1">
          {item.shortcut.map((key) => (
            <Kbd key={key}>{key}</Kbd>
          ))}
        </span>
      )}

      {item.page && (
        <Icon
          path={ICONS.chevronRight}
          className="size-3.5 shrink-0 text-muted-foreground"
        />
      )}
    </div>
  )
}
