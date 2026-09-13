import type { AnyPage, BoundPage, Page, PageTarget } from "./types"

/**
 * Staples a page to the props it needs, so the pair fits where one value goes.
 *
 * A command is data, not a call: `{ page: projectsPage }` has nowhere to put
 * `{ archived: false }`. This is that place, and it is the whole of it —
 * `{ page, props }`, which a caller could write by hand. What it adds is the
 * type: a page that declares props cannot be passed as a bare `PageTarget`,
 * so the compiler stops one being opened without what it needs to render.
 */
export function bind<Props, Result>(
  page: Page<Props, Result>,
  props: Props
): BoundPage<Props, Result> {
  return { page, props }
}

export function isBoundPage(target: PageTarget): target is BoundPage {
  return "page" in target
}

/** Flattens a page reference into the pair the reducer needs. */
export function resolveTarget(target: PageTarget): {
  page: AnyPage
  props: unknown
} {
  return isBoundPage(target)
    ? { page: target.page, props: target.props }
    : { page: target as AnyPage, props: undefined }
}
