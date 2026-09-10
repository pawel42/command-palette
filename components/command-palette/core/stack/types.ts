import type { AnyPage, EscapeRoute } from "../page/types"

export type PageInstance = {
  readonly instanceId: string
  readonly page: AnyPage
  readonly props: unknown
  /** Per-page input text. */
  readonly query: string
  readonly activeItemId: string | null
  /** Push-site escape override. */
  readonly escape?: EscapeRoute
}

export type PaletteState = {
  readonly stack: readonly PageInstance[]
  /** Monotonic counter behind instance ids — keeps the reducer deterministic. */
  readonly sequence: number
}

export type PaletteAction =
  | { type: "push"; page: AnyPage; props: unknown; escape?: EscapeRoute }
  | { type: "pop" }
  | { type: "popToRoot" }
  /** Back to a freshly mounted root — the state the palette started in. */
  | { type: "reset" }
  /** Drop everything above this instance, keeping it. */
  | { type: "unwindTo"; instanceId: string }
  /** Drop this instance and everything above it. */
  | { type: "dropFrom"; instanceId: string }
  | { type: "setQuery"; instanceId: string; query: string }
  | { type: "setActiveItem"; instanceId: string; itemId: string | null }
