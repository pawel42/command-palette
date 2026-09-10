import { resolveCommand } from "./commands"
import { createNavigation } from "./navigation"
import { createInitialState, paletteReducer } from "./reducer"
import type {
  Command,
  Navigation,
  PageContext,
  PageTarget,
  PaletteAction,
  PaletteState,
} from "./types"

export type PaletteStoreOptions = {
  rootPage: PageTarget
  /** Called when esc is pressed at the root with an empty input. */
  onDismiss?: () => void
}

export type DismissHandler = (() => void) | undefined

export type PaletteStore = {
  getState: () => PaletteState
  subscribe: (listener: () => void) => () => void
  dispatch: (action: PaletteAction) => void
  readonly navigation: Navigation
  escape: () => void
  /** Context bound to one instance; null once that instance is gone. */
  contextFor: (instanceId: string) => PageContext | null
  runCommand: (command: Command, instanceId?: string) => Promise<unknown> | void
  /** Lets a host swap the dismiss handler without rebuilding the store. */
  setOnDismiss: (onDismiss: DismissHandler) => void
}

/**
 * Framework-agnostic store. Command handlers dispatch through it from outside
 * React with no stale closures, and React reads it with `useSyncExternalStore`
 * — which keeps state updates out of effects entirely.
 */
export function createPaletteStore(options: PaletteStoreOptions): PaletteStore {
  let state = createInitialState(options.rootPage)

  let onDismiss = options.onDismiss
  const listeners = new Set<() => void>()
  const resolvers = new Map<string, (value: unknown) => void>()

  const getState = () => state

  const dispatch = (action: PaletteAction) => {
    const previous = state
    const next = paletteReducer(previous, action)
    if (next === previous) return

    state = next

    // One place settles every awaited push, whichever unwind dropped the page.
    const alive = new Set(next.stack.map((instance) => instance.instanceId))
    for (const instance of previous.stack) {
      if (alive.has(instance.instanceId)) continue

      const settle = resolvers.get(instance.instanceId)
      resolvers.delete(instance.instanceId)
      settle?.(undefined)
    }

    for (const listener of listeners) listener()
  }

  const settleAndClose = (instanceId: string, value: unknown) => {
    const settle = resolvers.get(instanceId)
    // Deleted first, so the drop below doesn't settle it a second time.
    resolvers.delete(instanceId)
    settle?.(value)
    dispatch({ type: "dropFrom", instanceId })
  }

  const navigation = createNavigation({
    getState,
    dispatch,
    registerResolver: (instanceId, settle) => resolvers.set(instanceId, settle),
    dismiss: () => onDismiss?.(),
  })

  const contextFor = (instanceId: string): PageContext | null => {
    const instance = state.stack.find(
      (entry) => entry.instanceId === instanceId
    )
    if (!instance) return null

    return {
      instanceId,
      props: instance.props,
      query: instance.query,
      setQuery: (query) => dispatch({ type: "setQuery", instanceId, query }),
      resolve: (value) => settleAndClose(instanceId, value),
      nav: navigation,
    }
  }

  return {
    getState,
    dispatch,
    navigation,
    escape: navigation.escape,
    contextFor,

    setOnDismiss: (handler) => {
      onDismiss = handler
    },

    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    runCommand: (command, instanceId) => {
      const target =
        instanceId ?? state.stack[state.stack.length - 1].instanceId
      const ctx = contextFor(target)
      if (!ctx) return
      return resolveCommand(command, ctx)
    },
  }
}
