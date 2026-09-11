import type { RunAsync, ToastInput } from "../async"
import type { FooterInput } from "./footer"

/**
 * What the palette's single input means on a given page:
 *  - "filter"   — editable; the query filters what the page renders
 *  - "input"    — editable; the page owns the text (async search, "create X")
 *  - "disabled" — rendered, but greyed out and not editable
 *  - "hidden"   — no input; the row carries the page's title instead
 *
 * None of them take the row away: the header row is the frame's, it is always
 * there, and every page below the root shows the same back button in it.
 *
 * The last two have no query to clear, so esc unwinds on the first press.
 *
 * While the input is editable the frame keeps the caret in it — a click on
 * anything unfocusable inside the palette goes back to the input, because the
 * list is driven from its key handler. A page with fields of its own is
 * therefore a page whose search is off: pick "disabled" for a form, so the row
 * stays put and nothing shifts on the way in, or "hidden" to drop it.
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
  /**
   * Work that takes a moment, with the palette reporting on it: the progress
   * bar while it runs, a toast when it lands. See `RunAsync`.
   *
   * A handler that simply returns its promise gets the same bar and the same
   * failure toast for free — this is the form that also names the outcome, and
   * the one a page's own buttons and effects can call.
   */
  runAsync: RunAsync
  /** Says something in the footer with no work behind it. */
  toast: (input: ToastInput) => void
}

/**
 * The chrome a page is not allowed to have, spelled out so the compiler can
 * say so. The header row — the back button, the icon, the input — is the
 * frame's on every page, because a palette whose chrome moves between pages is
 * a palette the user has to re-read on every push. The footer is the one place
 * a page adds anything of its own.
 *
 * `never` rather than leaving the fields out: an absent field only trips the
 * excess-property check on an object literal, and a config built by spreading
 * would walk straight past it.
 */
export type NoHeader = {
  icon?: never
  backIcon?: never
  back?: never
  header?: never
  headerRight?: never
  trailing?: never
  /** Actions go in the footer, under `footer.actions`. */
  actions?: never
}

export type PageDefinition<
  Props = void,
  Result = void,
  Component = unknown,
> = NoHeader & {
  readonly id: string
  /** Breadcrumb label, and what the header row shows when there is no input. */
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
  /**
   * The page's half of the footer: the actions behind ⌘⇧K, and the key hints
   * beside them. Static like `list`, and read during render for the same
   * reason — a footer known at definition time paints with the page instead of
   * arriving an effect later. The function form covers everything reachable
   * from the context; a footer that depends on the page's own React state
   * cannot be known here, and that page calls `usePageFooter` instead.
   */
  readonly footer?: FooterInput<Props, Result>
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

/**
 * What a command does. The return value is the handler's own business, with
 * one exception the palette reads: a promise means work that takes a moment,
 * and it gets the progress bar and a toast if it fails — see `RunAsync`.
 */
export type ActionHandler = (ctx: PageContext<any, any>) => unknown

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
  /**
   * Back to a freshly mounted root: every page above it is dropped and the
   * root itself is remounted, so page state and list scroll start over too.
   * A root that was never touched is left exactly as it is.
   */
  reset(): void
  /** Apply the esc rule: clear the input, or unwind along the page's route. */
  escape(): void
  setQuery(query: string): void
}

/* eslint-enable @typescript-eslint/no-explicit-any */
