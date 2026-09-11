"use client"

import type { ComponentType } from "react"

import { definePage } from "../../core"
import type { PageDefinition } from "../../core"
import { Highlight, ICONS, Icon, Kbd } from "../primitives"
import { useListPage } from "./use-list-page"
import type { AnyListConfig, ListPageConfig, ListRow } from "./use-list-page"

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
    component: ListPage,
  })
}

function ListPageView({ config }: { config: AnyListConfig }) {
  const { sections, isEmpty, emptyMessage, header, listProps } =
    useListPage(config)

  return (
    // --list-gap is the list's breathing room: its own padding, and the margin
    // every scrolled-to row and heading keeps from the edge of the scrollport.
    // h-full, not max-h: the frame's slot sets the height and this fills it, so
    // a list of two rows leaves the palette exactly as tall as a list of forty.
    <div className="h-full overflow-y-auto overscroll-contain p-(--list-gap) [--list-gap:--spacing(1.5)]">
      {header}

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
                <Row key={row.item.id} row={row} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function Row({ row }: { row: ListRow }) {
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
