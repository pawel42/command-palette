import type { ReactNode } from "react"

import type { Shortcut } from "../keys/tokens"
import type {
  ActionHandler,
  PageContext,
  PageTarget,
  PushOptions,
} from "../page/types"


export type Listable = {
  id: string
  title: string
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
