import type { ReactNode } from "react"

/**
 * What the palette's single input means on a given page:
 *  - "filter"   — editable; the query filters what the page renders
 *  - "input"    — editable; the page owns the text (async search, "create X")
 *  - "disabled" — rendered, but greyed out and not editable
 *  - "hidden"   — not rendered at all
 *
 * The last two have no query to clear, so esc unwinds on the first press.
 */
export type SearchMode = "filter" | "input" | "disabled" | "hidden"

/** Object states can be patched shallowly; anything else uses the updater form. */
export type SetState<State> = (
  patch: Partial<State> | ((previous: State) => State)
) => void

/**
 * Where esc goes once the page's input is already empty. The default unwinds
 * one level; the others unwind several at once, dropping the state of every
 * instance they pass.
 */
export type EscapeRoute = "back" | "root" | { to: AnyPage }

export type PushOptions = {
  /** Overrides the target page's own escape route for this push only. */
  escape?: EscapeRoute
}

/** Everything a page, or a command running on it, can reach. */
export type PageContext<Props = unknown, State = unknown, Result = unknown> = {
  instanceId: string
  props: Props
  state: State
  setState: SetState<State>
  query: string
  setQuery: (query: string) => void
  /** Settles the promise returned by the `push` that opened this page, then closes it. */
  resolve: (value: Result) => void
  nav: Navigation
}

export type PageDefinition<
  Props = void,
  State = unknown,
  Result = void,
  Component = unknown,
> = {
  readonly id: string
  /** Breadcrumb label. */
  readonly title?: string
  readonly search: SearchMode
  readonly placeholder?: string
  readonly initialState?: (props: Props) => State
  /** Optional async init; its context is bound to the new instance. */
  readonly load?: (
    ctx: PageContext<Props, State, Result>
  ) => void | Promise<void>
  readonly escape?: EscapeRoute
  /** Opaque to the engine — the React layer decides what a component is. */
  readonly component: Component
  /**
   * Phantom field. Keeps `Props` in a contravariant position so a page that
   * needs props cannot be used where a propless page is expected.
   */
  readonly __props?: (props: Props) => void
  /** Binds props so the page can be referenced from a plain object literal. */
  with(props: Props): BoundPage<Props, State, Result, Component>
}

/* eslint-disable @typescript-eslint/no-explicit-any -- variance placeholders: these
   types are containers, and narrowing them to `unknown` makes every concrete page
   unassignable to them. */

export type AnyPage = PageDefinition<any, any, any, any>

export type BoundPage<
  Props = any,
  State = any,
  Result = any,
  Component = any,
> = {
  readonly page: PageDefinition<Props, State, Result, Component>
  readonly props: Props
}

/** A page reference that needs nothing else: propless, or already bound. */
export type PageTarget<Result = any> =
  PageDefinition<void, any, Result, any> | BoundPage<any, any, Result, any>

export type ActionHandler<State = any> = (
  ctx: PageContext<any, State, any>
) => void | Promise<void>

export type CommandContext = PageContext<unknown, any, unknown>

export type Navigation = {
  push<State, Result>(
    page: PageDefinition<void, State, Result, any>,
    props?: void,
    options?: PushOptions
  ): Promise<Result | undefined>
  push<Props, State, Result>(
    page: PageDefinition<Props, State, Result, any>,
    props: Props,
    options?: PushOptions
  ): Promise<Result | undefined>
  /** Push an already-bound target — what command items carry. */
  open<Result>(
    target: PageTarget<Result>,
    options?: PushOptions
  ): Promise<Result | undefined>
  pop(): void
  /** Unwind to the topmost instance of a page already on the stack. */
  popTo(page: AnyPage): void
  popToRoot(): void
  /** Apply the esc rule: clear the input, or unwind along the page's route. */
  escape(): void
  setQuery(query: string): void
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/** Shared shape of anything the palette can list and filter. */
export type ItemMeta = {
  id: string
  title: string
  subtitle?: string
  section?: string
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
  | (ItemMeta & { page: PageTarget; options?: PushOptions; run?: never })
  | (ItemMeta & { run: ActionHandler; page?: never; options?: never })
  /** Display-only row: a loading placeholder, a hint, a separator label. */
  | (ItemMeta & { page?: never; run?: never; options?: never })

/** Minimum an item needs to be filtered and navigated. */
export type ListItemLike = {
  id: string
  title: string
  section?: string
  keywords?: readonly string[]
  disabled?: boolean
}

export type Match = {
  score: number
  /** Indices in the title that matched, for highlighting. */
  indices: readonly number[]
}

export type MatchedItem<T> = {
  item: T
  score: number
  indices: readonly number[]
}

export type FilteredGroup<T> = { section?: string; items: MatchedItem<T>[] }

export type PageInstance = {
  readonly instanceId: string
  readonly page: AnyPage
  readonly props: unknown
  /** Per-page input text. */
  readonly query: string
  /** Per-page local state; dies with the instance. */
  readonly state: unknown
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
  /** Drop everything above this instance, keeping it and its state. */
  | { type: "unwindTo"; instanceId: string }
  /** Drop this instance and everything above it. */
  | { type: "dropFrom"; instanceId: string }
  | { type: "setQuery"; instanceId: string; query: string }
  | { type: "setActiveItem"; instanceId: string; itemId: string | null }
  | { type: "setState"; instanceId: string; patch: unknown }
