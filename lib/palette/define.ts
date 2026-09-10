import type {
  AnyPage,
  BoundPage,
  PageContext,
  PageDefinition,
  PageTarget,
  SearchMode,
} from "./types"

export type PageInput<Props, State, Result, Component> = {
  id: string
  title?: string
  search?: SearchMode
  placeholder?: string
  initialState?: (props: Props) => State
  load?: (ctx: PageContext<Props, State, Result>) => void | Promise<void>
  escape?: PageDefinition<Props, State, Result, Component>["escape"]
  component: Component
}

/**
 * Identity helper: exists so `Props`, `State` and `Result` are inferred once,
 * here, and then flow into every hook, handler and `nav.push` call site.
 */
export function definePage<
  Props = void,
  State = void,
  Result = void,
  Component = unknown,
>(
  input: PageInput<Props, State, Result, Component>
): PageDefinition<Props, State, Result, Component> {
  const page: PageDefinition<Props, State, Result, Component> = {
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
