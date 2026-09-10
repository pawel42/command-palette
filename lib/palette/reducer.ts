import { resolveTarget } from "./define"
import type {
  AnyPage,
  EscapeRoute,
  PageInstance,
  PageTarget,
  PaletteAction,
  PaletteState,
} from "./types"

export function createInstance(
  page: AnyPage,
  props: unknown,
  sequence: number,
  escape?: EscapeRoute
): PageInstance {
  return {
    instanceId: `i${sequence}`,
    page,
    props,
    query: "",
    state: page.initialState ? page.initialState(props) : undefined,
    activeItemId: null,
    escape,
  }
}

export function createInitialState(rootPage: PageTarget): PaletteState {
  const { page, props } = resolveTarget(rootPage)
  return { stack: [createInstance(page, props, 0)], sequence: 1 }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function applyPatch(previous: unknown, patch: unknown): unknown {
  if (typeof patch === "function") {
    return (patch as (previous: unknown) => unknown)(previous)
  }
  if (isPlainObject(previous) && isPlainObject(patch)) {
    return { ...previous, ...patch }
  }
  return patch
}

/** Replaces one instance, returning the same state when nothing changed. */
function mapInstance(
  state: PaletteState,
  instanceId: string,
  update: (instance: PageInstance) => PageInstance
): PaletteState {
  const index = state.stack.findIndex(
    (instance) => instance.instanceId === instanceId
  )
  // An action aimed at a dropped instance is a no-op, not a crash: async
  // handlers can outlive the page that started them.
  if (index === -1) return state

  const updated = update(state.stack[index])
  if (updated === state.stack[index]) return state

  const stack = [...state.stack]
  stack[index] = updated
  return { ...state, stack }
}

/**
 * Pure stack transitions. Referential identity is preserved whenever an action
 * changes nothing, so `useSyncExternalStore` can compare snapshots by identity.
 */
export function paletteReducer(
  state: PaletteState,
  action: PaletteAction
): PaletteState {
  switch (action.type) {
    case "push": {
      const instance = createInstance(
        action.page,
        action.props,
        state.sequence,
        action.escape
      )
      return { stack: [...state.stack, instance], sequence: state.sequence + 1 }
    }

    case "pop": {
      if (state.stack.length <= 1) return state
      return { ...state, stack: state.stack.slice(0, -1) }
    }

    case "popToRoot": {
      if (state.stack.length <= 1) return state
      return { ...state, stack: state.stack.slice(0, 1) }
    }

    case "unwindTo": {
      const index = state.stack.findIndex(
        (instance) => instance.instanceId === action.instanceId
      )
      if (index === -1 || index === state.stack.length - 1) return state
      return { ...state, stack: state.stack.slice(0, index + 1) }
    }

    case "dropFrom": {
      const index = state.stack.findIndex(
        (instance) => instance.instanceId === action.instanceId
      )
      // The root instance is never dropped.
      if (index <= 0) return state
      return { ...state, stack: state.stack.slice(0, index) }
    }

    case "setQuery": {
      return mapInstance(state, action.instanceId, (instance) =>
        instance.query === action.query
          ? instance
          : // A new result set starts from the top again.
            { ...instance, query: action.query, activeItemId: null }
      )
    }

    case "setActiveItem": {
      return mapInstance(state, action.instanceId, (instance) =>
        instance.activeItemId === action.itemId
          ? instance
          : { ...instance, activeItemId: action.itemId }
      )
    }

    case "setState": {
      return mapInstance(state, action.instanceId, (instance) => {
        const next = applyPatch(instance.state, action.patch)
        return next === instance.state ? instance : { ...instance, state: next }
      })
    }
  }
}
