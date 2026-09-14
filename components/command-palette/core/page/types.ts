import type { ReactNode } from "react"

import type { RunAsync, ToastInput } from "../async"
import type { FooterInput } from "./footer"

/**
 * Whether the page has the palette's single input:
 *  - "input"    — it does; the text is the page's query
 *  - "disabled" — it does not; the row carries the page's title instead
 *
 * One bit, and it is drawn as one: the input is there or it is not. "disabled"
 * means gone rather than greyed out — a box that cannot be typed into is a box
 * that only looks like one, and the title says more in the same space. It takes
 * nothing but the input: the header row is the frame's, it is always there, and
 * every page below the root shows the same back button in it.
 *
 * What the query *does* is not this field's business and never was. A page's
 * rows narrow as the user types because the page renders a `ListPage`, which
 * reads the query itself; a page that searches a server reads the same query
 * out of its context and does its own thing with it. Both are "input" — the
 * palette only needs to know whether to draw the box.
 *
 * A disabled page has no query to clear, so esc unwinds on the first press.
 *
 * While the input is there the frame keeps the caret in it — a click on
 * anything unfocusable inside the palette goes back to the input, because the
 * list is driven from its key handler. A page with fields of its own is
 * therefore a page whose input is off: "disabled" is what a form declares, so
 * its first field is the first thing the caret can land in.
 *
 * Left out, it defaults to "input": a palette page is something you type into
 * unless it says otherwise, and the frame cannot see inside `render` to tell.
 */
export type SearchMode = "input" | "disabled"

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
  /**
   * Closes the palette — what a command calls when it has sent the user
   * somewhere else, and there is nothing left to look at here.
   *
   * The default is the other way round: a run leaves the palette open, because
   * the palette is where a run is reported from. The bar belongs to the
   * command that is still working and the toast to the one that just landed,
   * and closing on every ↵ would be closing over both of them. So a command
   * that wants to be the last thing in the palette says so.
   *
   * It closes and nothing more: the stack, the page state and the text are all
   * still there on the next ⌘K, the same as any other close, until the idle
   * reset starts it over. `nav.reset()` first is how a command leaves a clean
   * root behind instead.
   *
   * Reaches the host through the same `onDismiss` esc does, so a palette given
   * none — an inline one, with nothing to close to — goes on ignoring it.
   */
  closePalette: () => void
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

/** The `useSyncExternalStore` pair, named so a config can carry it — what the `ListPage` component's `watch` takes. */
export type ExternalStore = {
  subscribe: (onChange: () => void) => () => void
  getSnapshot: () => unknown
}

/** What both kinds of page carry. A page is a plain object; see `Page`. */
type PageBase<Props, Result> = NoHeader & {
  readonly id: string
  /** Breadcrumb label, and what the header row shows when there is no input. */
  readonly title?: string
  /** Defaults to "input" — see `SearchMode` and `searchModeOf`. */
  readonly search?: SearchMode
  readonly placeholder?: string
  readonly escape?: EscapeRoute
  /**
   * The page's half of the footer: the actions behind ⌘⇧K, and the key hints
   * beside them. Read during render, so a footer known here paints with the
   * page instead of arriving an effect later. The function form covers
   * everything reachable from the context; a footer that depends on the page's
   * own React state cannot be known here, and that page calls `usePageFooter`
   * instead.
   */
  readonly footer?: FooterInput<Props, Result>
  /**
   * Phantom field. Keeps `Props` in a contravariant position so a page that
   * needs props cannot be used where a propless page is expected.
   */
  readonly __props?: (props: Props) => void
}

/**
 * A page: a plain object with an `id` and a body. Nothing builds it and
 * nothing registers it — it is data, like the commands that open it, and the
 * palette reads what it needs off it.
 *
 *   const menu: Page = { id: "menu", render: () => <ListPage items={…} /> }
 *   const notes: Page = { id: "notes", title: "Notes", render: () => <Notes /> }
 *
 * `render` is mounted as a component, never called, so it keeps its own hooks,
 * state and effects — and it is handed the page's context as props, so
 * `props`, `resolve` and `nav` arrive without asking. Anything nested deeper
 * reaches the same context through the hooks.
 *
 * A list is not a kind of page but a component: `ListPage` (in `ui/`) is the
 * filtered, keyboard-navigable list of commands, configured inside `render`
 * like any other body.
 *
 * `Props` is what the caller has to supply and `Result` what the page hands
 * back through `resolve` — both default to nothing, which is most pages.
 */
export type Page<Props = void, Result = void> = PageBase<Props, Result> & {
  readonly render: (ctx: PageContext<Props, Result>) => ReactNode
}

/* eslint-disable @typescript-eslint/no-explicit-any -- variance placeholders: these
   types are containers, and narrowing them to `unknown` makes every concrete page
   unassignable to them. */

export type AnyPage = Page<any, any>

/**
 * What a command does. The return value is the handler's own business, with
 * one exception the palette reads: a promise means work that takes a moment,
 * and it gets the progress bar and a toast if it fails — see `RunAsync`.
 */
export type ActionHandler = (ctx: PageContext<any, any>) => unknown

/** A page and the props it was given — what `bind` returns. */
export type BoundPage<Props = any, Result = any> = {
  readonly page: Page<Props, Result>
  readonly props: Props
}

/** A page reference that needs nothing else: propless, or already bound. */
export type PageTarget<Result = any> =
  Page<void, Result> | BoundPage<any, Result>

export type Navigation = {
  push<Result>(
    page: Page<void, Result>,
    props?: void,
    options?: PushOptions
  ): Promise<Result | undefined>
  push<Props, Result>(
    page: Page<Props, Result>,
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
