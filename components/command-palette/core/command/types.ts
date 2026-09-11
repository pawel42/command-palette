import type { ReactNode } from "react"

import type {
  ActionHandler,
  PageContext,
  PageTarget,
  PushOptions,
} from "../page/types"

/** Shared shape of anything the palette can list and filter. */
export type ItemMeta = {
  id: string
  title: string
  subtitle?: string
  section?: string
  /**
   * The trailing label on a row that shows one, defaulting to `section`. Worth
   * setting only when the two differ: a row regrouped under a heading of its
   * own — "Recent", "Results" — can still say where it actually lives.
   */
  label?: string
  keywords?: readonly string[]
  shortcut?: readonly string[]
  icon?: ReactNode
  disabled?: boolean
}

/**
 * A root-level command: it either opens a page or runs an action, never both.
 * Pages that render lists reuse this shape for their own items — the root
 * registry is just the one place that is *only* commands.
 */
export type Command =
  | (ItemMeta & {
      page: PageTarget
      options?: PushOptions
      run?: never
      onError?: never
    })
  | (ItemMeta & {
      run: ActionHandler
      page?: never
      options?: never
      /**
       * What to do when this command's work fails, beyond the toast the user
       * is shown: log it, report it, undo something. Called with the error.
       *
       * Nothing happens to a caught failure without this — see
       * `RunAsyncOptions.onError`, which is where it ends up. It applies to a
       * handler that returns its promise; one that calls `runAsync` itself
       * declares the same thing there, next to the messages.
       */
      onError?: (error: unknown) => void
    })
  /** Display-only row: a loading placeholder, a hint, a separator label. */
  | (ItemMeta & {
      page?: never
      run?: never
      options?: never
      onError?: never
    })

export type CommandContext = PageContext<unknown, unknown>
