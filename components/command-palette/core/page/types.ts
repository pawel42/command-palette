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

/**
 * Where esc goes once the page's input is already empty. The default unwinds
 * one level; the others unwind several at once, dropping every instance they
 * pass.
 */
export type EscapeRoute = "back" | "root" | { to: AnyPage }

export type PushOptions = {
  /** Overrides the target page's own escape route for this push only. */
  escape?: EscapeRoute
}

/**
 * Everything a page, or a command running on it, can reach.
 *
 * Deliberately not here: the page's own state. A page is hidden rather than
 * unmounted, so ordinary React state survives being navigated away from and
 * closed — there is nothing for the engine to hold on its behalf.
 */
export type PageContext<Props = unknown, Result = unknown> = {
  instanceId: string
  props: Props
  query: string
  setQuery: (query: string) => void
  /** Settles the promise returned by the `push` that opened this page, then closes it. */
  resolve: (value: Result) => void
  nav: Navigation
}

export type PageDefinition<Props = void, Result = void, Component = unknown> = {
  readonly id: string
  /** Breadcrumb label. */
  readonly title?: string
  readonly search: SearchMode
  readonly placeholder?: string
  readonly escape?: EscapeRoute
  /**
   * Renders a keyboard-navigable list. The frame reads this to decide whether
   * "↑↓ navigate" applies, and it has to be known at definition time —
   * deriving it from the mounted page would mean an effect, and the footer
   * would flicker on first paint.
   */
  readonly list?: boolean
  /** Opaque to the engine — the React layer decides what a component is. */
  readonly component: Component
  /**
   * Phantom field. Keeps `Props` in a contravariant position so a page that
   * needs props cannot be used where a propless page is expected.
   */
  readonly __props?: (props: Props) => void
  /** Binds props so the page can be referenced from a plain object literal. */
  with(props: Props): BoundPage<Props, Result, Component>
}

/* eslint-disable @typescript-eslint/no-explicit-any -- variance placeholders: these
   types are containers, and narrowing them to `unknown` makes every concrete page
   unassignable to them. */

export type AnyPage = PageDefinition<any, any, any>

export type BoundPage<Props = any, Result = any, Component = any> = {
  readonly page: PageDefinition<Props, Result, Component>
  readonly props: Props
}

/** A page reference that needs nothing else: propless, or already bound. */
export type PageTarget<Result = any> =
  PageDefinition<void, Result, any> | BoundPage<any, Result, any>

export type ActionHandler = (ctx: PageContext<any, any>) => void | Promise<void>

export type Navigation = {
  push<Result>(
    page: PageDefinition<void, Result, any>,
    props?: void,
    options?: PushOptions
  ): Promise<Result | undefined>
  push<Props, Result>(
    page: PageDefinition<Props, Result, any>,
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
