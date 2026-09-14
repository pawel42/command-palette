"use client"

import { useState } from "react"
import type { ReactNode } from "react"

import { bind } from "../core"
import type {
  ExternalStore,
  ListCommand,
  Page,
  PageContext,
  PageTarget,
} from "../core"

import { ListPage } from "./list-page"
import type { Trailing } from "./list-page"

/**
 * What a host says about the page the palette opens on. There is no root page
 * to write: the root is always one `ListPage` over the host's commands, so the
 * host hands over the commands and, if it wants them, the few things that list
 * can vary.
 *
 * Four fields of a page are missing, because at the root they are not the
 * host's to set: `id` and `title` are the root's own, `search` is the filter
 * the palette opens on, and `escape` is `onDismiss` — esc at the root with an
 * empty input closes the palette rather than going anywhere.
 */
export type RootConfig = Omit<
  Page<unknown, unknown>,
  "id" | "title" | "search" | "escape" | "render" | "__props"
> & {
  /**
   * Every command the palette opens on: a plain array, or a function of the
   * palette's context — the query, most of all — for a root that reorders or
   * regroups itself as the user types.
   */
  commands: ListCommand[] | ((ctx: PageContext) => ListCommand[])
  /** The rest of the root's `ListPage` config — see `ListPageProps`. */
  emptyMessage?: string
  note?: ReactNode
  watch?: ExternalStore
  trailing?: Trailing
}

/**
 * Builds the root page from what the host passed, once.
 *
 * Once, because a page object *is* the page: the store is built from this one
 * and the stack is keyed off it, so handing over a new one on a re-render
 * would remount the root and throw away the user's place in it. The whole
 * config is therefore read at mount, the same moment as the store built from
 * it — see `PaletteProvider`. A root that moves while the palette lives moves
 * through the two seams built for exactly that: a `commands` function, which
 * runs on every render of the list, and `watch`, which says what outside React
 * the list is built from. What that function cannot do is close over the
 * host's React state, because the closure is as old as the page.
 */
export function useRootPage(config: RootConfig): PageTarget {
  const [page] = useState(() => {
    const { commands, emptyMessage, note, watch, trailing, ...rest } = config

    const root: Page<unknown, unknown> = {
      ...rest,
      id: "root",
      search: "input",
      render: () => (
        <ListPage
          items={(ctx) =>
            typeof commands === "function" ? commands(ctx) : commands
          }
          emptyMessage={emptyMessage}
          note={note}
          watch={watch}
          trailing={trailing}
        />
      ),
    }

    // Bound, so a root that takes no props is still a reference the store can
    // be handed.
    return bind(root, undefined)
  })

  return page
}
