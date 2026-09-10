"use client"

import type { ComponentType } from "react"

import { definePage } from "@/lib/palette"
import type { PageDefinition } from "@/lib/palette"
import { markListPage } from "./page-kinds"
import { Highlight, ICONS, Icon, Kbd } from "./primitives"
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

  return markListPage(
    definePage<Props, Result, ComponentType>({
      id: config.id,
      title: config.title,
      search: config.search ?? "filter",
      placeholder: config.placeholder,
      escape: config.escape,
      component: ListPage,
    })
  )
}

function ListPageView({ config }: { config: AnyListConfig }) {
  const { sections, isEmpty, emptyMessage, header, listProps } =
    useListPage(config)

  return (
    <div className="max-h-80 overflow-y-auto overscroll-contain p-1.5">
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
                  className="px-2 pt-2 pb-1.5 text-xs font-medium text-muted-foreground"
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
        isActive ? "bg-accent text-accent-foreground" : "text-foreground",
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
