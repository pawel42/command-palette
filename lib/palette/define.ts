import type {
  AnyPage,
  BoundPage,
  PageDefinition,
  PageTarget,
  SearchMode,
} from "./types"

export type PageInput<Props, Result, Component> = {
  id: string
  title?: string
  search?: SearchMode
  placeholder?: string
  escape?: PageDefinition<Props, Result, Component>["escape"]
  component: Component
}

/**
 * Identity helper: exists so `Props` and `Result` are inferred once, here, and
 * then flow into every hook, handler and `nav.push` call site.
 */
export function definePage<Props = void, Result = void, Component = unknown>(
  input: PageInput<Props, Result, Component>
): PageDefinition<Props, Result, Component> {
  const page: PageDefinition<Props, Result, Component> = {
    ...input,
    search: input.search ?? "filter",
    with: (props: Props) => ({ page, props }),
  }

  return page
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
