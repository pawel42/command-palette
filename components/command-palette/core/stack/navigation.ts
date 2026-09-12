import { untracked } from "../async"
import { resolveTarget } from "../page/target"
import type {
  AnyPage,
  Navigation,
  PageTarget,
  PushOptions,
} from "../page/types"
import { resolveEscape } from "./escape"
import type { PaletteAction, PaletteState } from "./types"

export type NavigationDeps = {
  getState: () => PaletteState
  dispatch: (action: PaletteAction) => void
  /** Called with the new instance id so `push` can be awaited. */
  registerResolver: (
    instanceId: string,
    settle: (value: unknown) => void
  ) => void
  dismiss: () => void
}

export function createNavigation(deps: NavigationDeps): Navigation {
  const topInstance = () => {
    const { stack } = deps.getState()
    return stack[stack.length - 1]
  }

  const push = (page: AnyPage, props?: unknown, options?: PushOptions) => {
    deps.dispatch({ type: "push", page, props, escape: options?.escape })

    const instance = topInstance()
    // Settles with the page's own `resolve(value)`, or with undefined as soon
    // as the instance is dropped by any unwind. Marked untracked because it
    // stays pending for as long as the page is open, and a command that
    // returns it is navigating rather than working — see `async.ts`.
    return untracked(
      new Promise<unknown>((settle) =>
        deps.registerResolver(instance.instanceId, settle)
      )
    )
  }

  const navigation = {
    push,

    open: (target: PageTarget, options?: PushOptions) => {
      const { page, props } = resolveTarget(target)
      return push(page, props, options)
    },

    pop: () => deps.dispatch({ type: "pop" }),

    popTo: (page: AnyPage) => {
      const { stack } = deps.getState()
      for (let index = stack.length - 2; index >= 0; index--) {
        if (stack[index].page === page) {
          deps.dispatch({
            type: "unwindTo",
            instanceId: stack[index].instanceId,
          })
          return
        }
      }
    },

    popToRoot: () => deps.dispatch({ type: "popToRoot" }),

    reset: () => deps.dispatch({ type: "reset" }),

    escape: () => {
      const outcome = resolveEscape(deps.getState())

      switch (outcome.type) {
        case "clearQuery":
          deps.dispatch({
            type: "setQuery",
            instanceId: outcome.instanceId,
            query: "",
          })
          break
        case "pop":
          deps.dispatch({ type: "pop" })
          break
        case "unwindTo":
          deps.dispatch({ type: "unwindTo", instanceId: outcome.instanceId })
          break
        case "dismiss":
          deps.dismiss()
          break
      }
    },

    setQuery: (query: string) =>
      deps.dispatch({
        type: "setQuery",
        instanceId: topInstance().instanceId,
        query,
      }),
  }

  // One cast, here: `push` is overloaded in the public type so call sites infer
  // props and results, while the implementation takes the widened shape.
  return navigation as unknown as Navigation
}
