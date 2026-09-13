import { createAsyncTasks, isUntracked } from "./async"
import type { AsyncTasks } from "./async"
import { resolveCommand } from "./command/run"
import type { Command } from "./command/types"
import type { Navigation, PageContext, PageTarget } from "./page/types"
import { createNavigation } from "./stack/navigation"
import { createInitialState, paletteReducer } from "./stack/reducer"
import type { PaletteAction, PaletteState } from "./stack/types"

export type PaletteStoreOptions = {
  rootPage: PageTarget
  /** Called when esc is pressed at the root with an empty input. */
  onDismiss?: () => void
  /**
   * Called with every command the palette runs, just before it runs. The
   * host's window on what was used — a recents list, an analytics ping —
   * without wrapping each command's own handler, which a command that opens a
   * page has nowhere to put.
   */
  onCommand?: (command: Command) => void
  /**
   * How long work must run before the palette shows a progress bar for it.
   * See `REVEAL_MS`; `0` shows one the moment anything starts.
   */
  revealMs?: number
}

/**
 * What the palette says while a command that declared nothing is running: its
 * own title, as something in progress. "Deploy a Preview" → "Deploy a
 * Preview…".
 *
 * Every run has to say what it is — see `RunAsyncOptions.loading` — and a
 * handler that merely returned a promise has said nothing. The row the user
 * just pressed ↵ on is the best answer available, and it is usually the right
 * one: they named the command after what it does.
 */
function progressLabel(title: string): string {
  return title.endsWith("…") ? title : `${title}…`
}

export type DismissHandler = (() => void) | undefined

export type CommandHandler = ((command: Command) => void) | undefined

export type PaletteStore = {
  getState: () => PaletteState
  subscribe: (listener: () => void) => () => void
  dispatch: (action: PaletteAction) => void
  readonly navigation: Navigation
  escape: () => void
  /** Context bound to one instance; null once that instance is gone. */
  contextFor: (instanceId: string) => PageContext | null
  /** Whatever the command's handler returned — see `ActionHandler`. */
  runCommand: (command: Command, instanceId?: string) => unknown
  /**
   * The progress bar and the toast, and the way to put work behind them. Not
   * tied to a page: a run outlives the row that started it, and the palette
   * reports it wherever the user has got to by the time it lands.
   */
  readonly tasks: AsyncTasks
  /** Lets a host swap the dismiss handler without rebuilding the store. */
  setOnDismiss: (onDismiss: DismissHandler) => void
  /** The same, for the ran-a-command handler. */
  setOnCommand: (onCommand: CommandHandler) => void
}

/**
 * Framework-agnostic store. Command handlers dispatch through it from outside
 * React with no stale closures, and React reads it with `useSyncExternalStore`
 * — which keeps state updates out of effects entirely.
 */
export function createPaletteStore(options: PaletteStoreOptions): PaletteStore {
  let state = createInitialState(options.rootPage)

  let onDismiss = options.onDismiss
  let onCommand = options.onCommand
  const tasks = createAsyncTasks({ revealMs: options.revealMs })
  const listeners = new Set<() => void>()
  const resolvers = new Map<string, (value: unknown) => void>()

  const getState = () => state

  /**
   * Which actions mean "the user has moved on". Typing and picking a row are
   * not on the list: a run that started from this page is still the run this
   * page is waiting for.
   */
  const NAVIGATIONS: ReadonlySet<PaletteAction["type"]> = new Set([
    "push",
    "pop",
    "popToRoot",
    "reset",
    "unwindTo",
    "dropFrom",
  ])

  const dispatch = (action: PaletteAction) => {
    const previous = state
    const next = paletteReducer(previous, action)

    // A reset is the palette starting over, and the footer is part of what
    // starts over — including the message a run left behind while the palette
    // was closed, which has been sitting there with its timer stopped. Before
    // the early return below, because a reset on an untouched root changes no
    // state and still means this.
    if (action.type === "reset") {
      tasks.cancel()
      tasks.dismissToast()
    }

    if (next === previous) return

    // Work belongs to the page that asked for it. Leaving that page — popping
    // it, pushing over it, resolving it, unwinding past it — calls the work
    // off, rather than leaving a bar running over a page that never asked for
    // one and an outcome landing somewhere it means nothing. Only on a real
    // transition: an action the reducer ignored has moved nobody.
    if (NAVIGATIONS.has(action.type)) tasks.cancel()

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
      runAsync: tasks.run,
      toast: tasks.toast,
    }
  }

  return {
    getState,
    dispatch,
    navigation,
    escape: navigation.escape,
    contextFor,
    tasks,

    setOnDismiss: (handler) => {
      onDismiss = handler
    },

    setOnCommand: (handler) => {
      onCommand = handler
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

      // Announced before it runs.
      onCommand?.(command)

      // What the palette was saying before this command touched anything.
      const runBefore = tasks.currentRun()
      const toastBefore = tasks.getSnapshot().toast?.id

      const result = resolveCommand(command, ctx)

      // The run in flight is no longer the one we started with, so this
      // command has already dealt with it — by starting a run of its own
      // (`async save() { await runAsync(…) }`), or by navigating, which calls
      // work off in `dispatch`. Wrapping again would only cancel what it just
      // started, since a second run is what cancelling means.
      if (tasks.currentRun() !== runBefore) return result

      // An `async run` is a run that takes a moment, with nothing declared
      // anywhere: returning a promise is the whole opt-in. The bar shows if it
      // outlasts the reveal delay, and a rejection becomes a toast instead of
      // an unhandled rejection nobody sees.
      //
      // `isUntracked` is what keeps the two promises that only *look* like
      // work out of it — a page push, and a handler that already called
      // `runAsync` itself. See `async.ts`.
      if (result instanceof Promise && !isUntracked(result)) {
        return tasks.run(result, {
          loading: progressLabel(command.title),
          // The command's own say in how its failure is handled. Only reached
          // on this path: a handler that called `runAsync` itself passed its
          // options there, and they are the ones that count.
          onError: command.onError,
        })
      }

      // A command that did its work there and then. It is still the thing the
      // user just chose, so it replaces what the palette was busy with: one
      // command at a time is one command at a time whether or not the new one
      // takes any. Without this, picking something instant while a run was in
      // flight left the spinner turning behind its message.
      //
      // The old message goes with it — but only if there was one, and only if
      // it is still the one showing. Guarded rather than passed straight
      // through, because `dismissToast()` with nothing means *whatever is up*,
      // and from a quiet palette that is the toast this command just put there
      // ("Copied") — which is the one thing here that must survive.
      tasks.cancel()
      if (toastBefore !== undefined) tasks.dismissToast(toastBefore)

      return result
    },
  }
}
