import type { ReactNode } from "react"

import type { RunAsync, ToastInput } from "../async"
import type { Command } from "../command/types"
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
 *
 * Left out, it follows the kind of page: a list filters, and a page with a
 * body of its own gets "disabled", because a live input that filters nothing
 * is an invitation to type into nothing.
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

/** The `useSyncExternalStore` pair, named so a page can carry it. */
export type ExternalStore = {
  subscribe: (onChange: () => void) => () => void
  getSnapshot: () => unknown
}

/** What both kinds of page carry. A page is a plain object; see `Page`. */
type PageBase<Props, Result> = NoHeader & {
  readonly id: string
  /** Breadcrumb label, and what the header row shows when there is no input. */
  readonly title?: string
  /** Defaults to the kind of page — see `SearchMode` and `searchModeOf`. */
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
 * A page that is a list of commands: filtered by the input, navigable with the
 * arrows, each row opening a page or running an action. The palette renders it
 * — there is no component to write.
 */
export type ListPage<Props = void, Result = void> = PageBase<Props, Result> & {
  /** Static, or derived from the query and the page's props. */
  readonly items: Command[] | ((ctx: PageContext<Props, Result>) => Command[])
  readonly emptyMessage?: string
  /**
   * A line of prose above the rows. Part of the list, not the chrome: it sits
   * inside the list's own scroll box and scrolls with the rows. The header is
   * the frame's on every page — see `NoHeader`.
   */
  readonly note?: (ctx: PageContext<Props, Result>) => ReactNode
  /**
   * For items that come from a store outside React — a recents list, a cache.
   * The page only subscribes to the palette's own state, so without this a
   * write out there would not reach the rows until the next keystroke did.
   */
  readonly watch?: ExternalStore
  readonly render?: never
}

/**
 * A page with a body of its own. `render` is mounted as a component and handed
 * the page's context, so `props`, `resolve` and `nav` arrive as its props —
 * and anything nested deeper reaches the same context through the hooks.
 */
export type RenderPage<Props = void, Result = void> = PageBase<
  Props,
  Result
> & {
  readonly render: (ctx: PageContext<Props, Result>) => ReactNode
  readonly items?: never
  readonly emptyMessage?: never
  readonly note?: never
  readonly watch?: never
}

/**
 * A page: a plain object, either a list of commands or a body of your own.
 * Nothing builds it and nothing registers it — it is data, like the commands
 * that open it, and the palette reads what it needs off it.
 *
 *   const notes: Page = { id: "notes", title: "Notes", render: () => <Notes /> }
 *   const menu: Page = { id: "menu", items: [ … ] }
 *
 * `Props` is what the caller has to supply and `Result` what the page hands
 * back through `resolve` — both default to nothing, which is most pages.
 */
export type Page<Props = void, Result = void> =
  ListPage<Props, Result> | RenderPage<Props, Result>

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
