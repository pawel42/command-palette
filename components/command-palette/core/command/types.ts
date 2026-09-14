import type { ReactNode } from "react"

import type { Shortcut } from "../keys/tokens"
import type { PathPattern } from "../routes/types"
import type {
  ActionHandler,
  PageContext,
  PageTarget,
  PushOptions,
} from "../page/types"

export type Listable = {
  id: string
  title: string
  /**
   * Where this command exists, as rules over the app's own pathnames — see
   * `PathPattern`. Required, and required of every command there is: a palette
   * that spans an app is a palette whose rows are answerable to where the user
   * is, and a default would only mean the question went unasked.
   *
   * Nothing is available until a rule says so, and the last rule that covers
   * the path wins: `["/*"]` is everywhere, `["/*", "!/admin/*"]` is everywhere
   * but the admin area, `["/projects/[id]"]` is one route and its dynamic
   * segment.
   *
   * A command that is not available here is not *drawn* here: it is out of the
   * list, out of the action panel, and its shortcut does nothing. There is no
   * greyed-out row — an unavailable command is one the user has no business
   * seeing, not one they should be told they cannot have.
   */
  paths: readonly PathPattern[]
  description?: string
  section?: string
  keywords?: readonly string[]
  shortcut?: Shortcut
  icon?: ReactNode
}

export type Command =
  | (Listable & {
      page: PageTarget
      options?: PushOptions
      run?: never
    })
  | (Listable & {
      run: ActionHandler
      page?: never
      options?: never
    })

export type CommandContext = PageContext<unknown, unknown>

export type ListCommand = Command & { group?: string }
