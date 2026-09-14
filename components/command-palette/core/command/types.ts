import type { ReactNode } from "react"

import type { Shortcut } from "../keys/tokens"
import type { PathPattern } from "../routes/types"
import type { RolePattern } from "../roles/types"
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
  /**
   * Who this command is for, as rules over the app's own roles — see
   * `RolePattern`. Required for the same reason `paths` is: a command is
   * answerable to who is looking as well as to where they are, and a default
   * would only mean the second question went unasked.
   *
   * Nothing is available until a rule says so: `["*"]` is everyone,
   * `["admin", "support"]` is either one, and `["*", "!viewer"]` is everyone
   * but viewers — a deny winning wherever it sits, which is where the reading
   * parts company with `paths`' and why. See `isAvailableTo`.
   *
   * Unavailable behaves exactly as it does for `paths` — out of the list, out
   * of the action panel, shortcut dead. The two are read together, and a
   * command has to survive both.
   *
   * **This is what the palette draws, not what the user is allowed to do.**
   * Commands are client data: hiding a row hides it from the UI and from
   * nobody else. Whatever the command goes on to call still has to check for
   * itself, on the other side of the network.
   */
  roles: readonly RolePattern[]
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
