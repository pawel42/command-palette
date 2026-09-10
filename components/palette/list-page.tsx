"use client"

import type { ComponentType } from "react"

import { definePage, resolveCommand } from "@/lib/palette"
import type {
  Command,
  EscapeRoute,
  PageContext,
  PageDefinition,
  SearchMode,
} from "@/lib/palette"
import {
  useCommandList,
  useInstanceId,
  usePaletteState,
  usePaletteStore,
} from "@/lib/palette/react"

import { usePublishBridge } from "./bridge"
import { Highlight, ICONS, Icon } from "./primitives"

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

type AnyListConfig = ListPageConfig<unknown, unknown, unknown>

/**
 * The one prebuilt page kind: a filtered, keyboard-navigable list whose items
 * either open a page or run an action. It is built on the public hooks only —
 * a hand-written page can do everything this does.
 */
export function listPage<Props = void, State = void, Result = void>(
  config: ListPageConfig<Props, State, Result>
): PageDefinition<Props, State, Result, ComponentType> {
  function ListPage() {
    return <ListPageView config={config as unknown as AnyListConfig} />
  }
  ListPage.displayName = `ListPage(${config.id})`

  return definePage<Props, State, Result, ComponentType>({
    id: config.id,
    title: config.title,
    search: config.search ?? "filter",
    placeholder: config.placeholder,
    escape: config.escape,
    initialState: config.initialState,
    load: config.load,
    component: ListPage,
  })
}

function ListPageView({ config }: { config: AnyListConfig }) {
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

  return (
    <div className="max-h-80 overflow-y-auto overscroll-contain p-1.5">
      {ctx !== null && config.header?.(ctx)}

      <div {...list.listProps} aria-label={config.title ?? "Commands"}>
        {list.entries.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            {config.emptyMessage ?? "No results found."}
          </p>
        ) : (
          list.groups.map((group, groupIndex) => {
            const headingId = `${list.listProps.id}-group-${groupIndex}`

            return (
              <div
                key={group.section ?? groupIndex}
                role="group"
                aria-labelledby={group.section ? headingId : undefined}
                className="mb-1 last:mb-0"
              >
                {group.section && (
                  <div
                    id={headingId}
                    className="px-2 pt-2 pb-1.5 text-xs font-medium text-muted-foreground"
                  >
                    {group.section}
                  </div>
                )}

                {group.items.map(({ item, indices }) => {
                  const index = list.entries.findIndex(
                    (entry) => entry.item.id === item.id
                  )
                  const isActive = index === list.activeIndex

                  return (
                    <div
                      key={item.id}
                      {...list.getItemProps(item, index)}
                      className={[
                        "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm select-none",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground",
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
                            <kbd
                              key={key}
                              className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground"
                            >
                              {key}
                            </kbd>
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
                })}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
