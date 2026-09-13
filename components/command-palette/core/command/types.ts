import type { ReactNode } from "react"

import type { Shortcut } from "../keys/tokens"
import type {
  ActionHandler,
  PageContext,
  PageTarget,
  PushOptions,
} from "../page/types"

/** Shared shape of anything the palette can list and filter. */
export type CommandItem = {
  id: string
  title: string
  description?: string
  /** Where this row lives: its heading, and what a list prints on its right edge. */
  section?: string
  keywords?: readonly string[]
  /**
   * The chord that runs this row from anywhere the list has focus, declared by
   * key name — `["Mod", "N"]` is ⌘N on a Mac and ctrl+N everywhere else.
   */
  shortcut?: Shortcut
  icon?: ReactNode
}

/**
 * A root-level command: it either opens a page or runs an action, never both.
 * Pages that render lists reuse this shape for their own items — the root
 * registry is just the one place that is *only* commands.
 */
export type Command =
  | (CommandItem & {
      page: PageTarget
      options?: PushOptions
      run?: never
    })
  | (CommandItem & {
      run: ActionHandler
      page?: never
      options?: never
    })

export type CommandContext = PageContext<unknown, unknown>

/**
 * A command as a *list* holds one, which is a command plus where that list has
 * decided to file it. `group` is the heading to draw it under when that is not
 * its section — a row copied into "Recent", or every row under "Results" while
 * the user types — and `section` is left alone, so a regrouped row goes on
 * saying on its right edge whether it is a page or an action.
 *
 * Deliberately not part of `Command`: nobody writes `group` on a command they
 * are declaring. It is set by whatever does the regrouping, on its way into a
 * list, which is why it appears here and on nothing a registry is typed as.
 */
export type ListCommand = Command & { group?: string }
