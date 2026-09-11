/**
 * Work that takes a moment, and what the palette says about it.
 *
 * One module, because it is one rule: *something is happening* is the progress
 * bar under the input, *what happened* is a toast in the footer, and both are
 * the frame's to draw. A command that runs from the root, from a page, or from
 * the action panel therefore reports itself in exactly one place, and a page
 * never has to build a spinner of its own.
 *
 * Everything here is a plain store — no React, like the rest of `core/`. The
 * store in `store.ts` owns one and hands `runAsync` to every command through
 * its context.
 */

/* ------------------------------------------------------------------ types */

/**
 * Three, and deliberately no "info": a toast exists because something was set
 * in motion and then landed. A line of prose with nothing behind it is a
 * footer hint or a list's `note`, and both of those already have a home.
 */
export type ToastKind = "loading" | "success" | "error"

export type Toast = {
  readonly id: string
  readonly kind: ToastKind
  readonly title: string
  /** Trailing detail, dimmed — the "why" behind a title that is the "what". */
  readonly message?: string
}

export type ToastInput = {
  title: string
  message?: string
  /** Defaults to "success", which is what a bare `toast()` almost always is. */
  kind?: ToastKind
}

/**
 * What to say about a settled run: a fixed string, or one built from what came
 * back. Returning `null` says nothing at all — which is how a run stays quiet,
 * or how an expected failure is kept out of the user's way.
 */
export type ToastMessage<T> = string | ((value: T) => string | null)

export type RunAsyncOptions<T> = {
  /**
   * What the palette says while the work is in flight: "Deploying…". Required,
   * because a user who is being made to wait is owed the reason — a spinner
   * alone says that something is happening, and the thing they want to know is
   * what. Shown only once the run outlasts `revealMs`, like the bar itself.
   *
   * A command handler that just returns a promise has said nothing, so the
   * store falls back to the command's own title — see `runCommand`. There is
   * no such fallback here: away from a command there is no title to take.
   */
  loading: string
  /** Omitted is a silent success: the bar goes, and nothing replaces it. */
  success?: ToastMessage<T>
  /**
   * Omitted is the error's own message. A rejection always says something
   * unless this is a function that returns `null`: a promise that fails into
   * silence is the thing this module exists to prevent.
   */
  error?: ToastMessage<unknown>
  /**
   * What to do with the failure besides showing it — log it, report it, undo
   * something. Called after the user has been told, with the error itself.
   *
   * Nothing happens to a caught error without this. Catching the rejection is
   * what stopped the browser from logging it, and whether a handled failure
   * deserves a line in the console, a line in Sentry, or silence belongs to
   * whoever wrote the command, not to the palette.
   */
  onError?: (error: unknown) => void
}

/**
 * Runs work with the palette reporting on it. Never rejects — the failure has
 * been shown to the user by the time this settles, so the result is `undefined`
 * and a caller is free to ignore it.
 *
 * One run at a time. Starting another, or navigating anywhere, aborts this one:
 * the signal handed to the work fires, and a run that was cut short resolves
 * `undefined` and says nothing, whatever it goes on to do. Which is what makes
 * `undefined` the one thing a caller has to check for — it means *this didn't
 * happen*, whether it failed or was abandoned.
 *
 * Takes a promise, or a function of the signal. The function form is the one
 * that can be cut short for real — `fetch(url, { signal })` — and it also
 * catches a handler that throws before it ever awaits, which is otherwise the
 * one failure that would escape.
 */
export type RunAsync = <T>(
  work: Promise<T> | ((signal: AbortSignal) => Promise<T> | T),
  options: RunAsyncOptions<T>
) => Promise<T | undefined>

/** What the frame draws: whether to show the bar, and the one toast, if any. */
export type AsyncSnapshot = {
  readonly busy: boolean
  readonly toast: Toast | null
}

export type AsyncTasks = {
  run: RunAsync
  /**
   * Aborts the run in flight, if there is one: its signal fires, its loading
   * toast goes, and it says nothing when it eventually settles. A no-op when
   * nothing is running.
   */
  cancel: () => void
  /**
   * The id of the run in flight, or null. The store compares it across a
   * command handler to tell whether the handler started a run of its own —
   * see `runCommand`.
   */
  currentRun: () => number | null
  /**
   * Tells the store whether the palette is on screen. While it is not, the
   * dismiss timers stand still — see `setVisible`.
   */
  setVisible: (visible: boolean) => void
  /** Says something with no work behind it: "Copied", "Nothing to push". */
  toast: (input: ToastInput) => void
  /**
   * Takes the current toast away early. With an id, only if that is still the
   * one showing — which is how a caller drops the message it saw a moment ago
   * without dropping one that has arrived since.
   */
  dismissToast: (id?: string) => void
  getSnapshot: () => AsyncSnapshot
  subscribe: (listener: () => void) => () => void
}

/* --------------------------------------------------------------- tracking */

/**
 * Promises the palette must not mistake for work.
 *
 * A command's `run` is tracked by the mere fact that it returned a promise —
 * that is what makes `run: async () => …` draw a progress bar with nothing
 * declared anywhere. Two promises would be caught by that rule wrongly:
 *
 *  - `nav.push(page)`, which stays pending for as long as the pushed page is
 *    open. A bar that runs until the user escapes a form is not progress, it
 *    is a palette that looks stuck.
 *  - whatever `runAsync` hands back, which is already being reported on. It
 *    would be counted twice, and a second failure toast could be built from an
 *    error the first one already showed.
 *
 * Marked at the source rather than sniffed at the destination, because neither
 * is something you can tell about a promise by looking at it.
 */
const UNTRACKED = new WeakSet<Promise<unknown>>()

/** Marks a promise as already accounted for, and returns it. */
export function untracked<T>(promise: Promise<T>): Promise<T> {
  UNTRACKED.add(promise)
  return promise
}

/** True for a promise the palette should stay quiet about. */
export function isUntracked(value: unknown): boolean {
  return value instanceof Promise && UNTRACKED.has(value)
}

/* ----------------------------------------------------------------- timing */

/**
 * How long work has to last before the palette mentions it at all. Below this,
 * a run shows its outcome and nothing else: a bar that appears for two frames
 * reads as a glitch rather than as progress, and the same goes for a "Saving…"
 * that is gone before it can be read.
 *
 * From quiet only. A run that replaces one the palette is already reporting on
 * takes the footer over on the spot — see `speaking` in `run`.
 */
export const REVEAL_MS = 120

/** How long an outcome sits in the footer. An error gets longer to read. */
const LINGER_MS: Record<Exclude<ToastKind, "loading">, number> = {
  success: 2500,
  error: 5000,
}

type Timer = ReturnType<typeof setTimeout>

/* ------------------------------------------------------------------ store */

/**
 * The one run in flight. There is never a second: the palette runs one thing
 * at a time, so the bar is one bar and the outcome in the footer is the
 * outcome of what the user last asked for, rather than of whichever of three
 * overlapping runs happened to land while they were reading.
 *
 * `shown` is what the bar draws — see `REVEAL_MS`. `settle` is what the
 * caller is waiting on, which is why cancelling can answer it immediately
 * instead of waiting for work that is no longer wanted.
 */
type Task = {
  id: number
  timer: Timer | null
  shown: boolean
  /** The loading toast this run put up, so it can take it back down. */
  toastId: string | null
  controller: AbortController
  settle: (value: undefined) => void
  cancelled: boolean
}

/** Stable identity for "nothing is happening", so idle never re-renders. */
const IDLE: AsyncSnapshot = { busy: false, toast: null }

function resolveMessage<T>(
  message: ToastMessage<T> | undefined,
  value: T
): string | null {
  if (message === undefined) return null
  return typeof message === "function" ? message(value) : message
}

/** The best sentence available for something that was thrown. */
function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error
  return "Something went wrong"
}

export function createAsyncTasks(
  options: { revealMs?: number } = {}
): AsyncTasks {
  const revealMs = options.revealMs ?? REVEAL_MS

  const listeners = new Set<() => void>()

  /** The run in flight, and there is at most one — see `Task`. */
  let current: Task | null = null
  let snapshot: AsyncSnapshot = IDLE
  let toast: Toast | null = null
  let linger: Timer | null = null
  /** What is left of the current toast's time, in ms; null if it has none. */
  let remaining: number | null = null
  /** When the countdown was last started, so pausing can keep the rest. */
  let startedAt = 0
  /**
   * Starts true, because the only thing that creates a toast is a command, and
   * a command is run from a palette that is on screen. A host that hides its
   * surface says so from an effect — see `usePaletteVisible` — which has
   * therefore always run by the time any of this matters.
   */
  let visible = true
  let sequence = 0

  /**
   * The one place a snapshot is built. `useSyncExternalStore` compares by
   * identity, so a new object is only ever made when the frame would draw
   * differently — and idle is always the same object.
   */
  const publish = () => {
    const busy = current?.shown === true

    if (busy === snapshot.busy && toast === snapshot.toast) return

    snapshot = busy || toast ? { busy, toast } : IDLE
    for (const listener of listeners) listener()
  }

  /**
   * Starts the current toast counting down, if it is the kind that does and
   * there is anyone to read it. A loading toast has no `remaining`: it stays
   * until its run settles.
   */
  const resumeLinger = () => {
    if (linger !== null || !visible || toast === null || remaining === null) {
      return
    }

    startedAt = Date.now()
    const { id } = toast
    linger = setTimeout(() => dismiss(id), remaining)
  }

  /** Stops the countdown, keeping what was left of it. */
  const pauseLinger = () => {
    if (linger === null) return

    clearTimeout(linger)
    linger = null
    if (remaining !== null) {
      remaining = Math.max(0, remaining - (Date.now() - startedAt))
    }
  }

  /**
   * One toast at a time, newest wins. The footer has one line for it, and a
   * stack of them in a palette would be a second thing to dismiss on the way
   * out — so an outcome simply replaces whatever was there.
   */
  const show = (input: ToastInput): string => {
    const kind = input.kind ?? "success"
    const id = `toast-${++sequence}`

    pauseLinger()
    // A loading toast stays until its run settles; the rest time out — but
    // only while the palette is on screen, which is what `remaining` is for.
    remaining = kind === "loading" ? null : LINGER_MS[kind]

    toast = { id, kind, title: input.title, message: input.message }
    publish()
    resumeLinger()

    return id
  }

  /** Dismisses by id, so a toast that has already been replaced is left alone. */
  const dismiss = (id?: string) => {
    if (id !== undefined && toast?.id !== id) return

    pauseLinger()
    remaining = null
    toast = null
    publish()
  }

  /**
   * Whether the palette is on screen. Only the dismiss timers care: a message
   * nobody can see is not being read, so it should not be spending the seconds
   * it was given to be read in.
   *
   * Which matters most for the case it was written for — work that outlives
   * the close. The run carries on with the palette shut, and its "Synced 12
   * files" is waiting, whole, on the next ⌘K, instead of having quietly come
   * and gone in a closed window.
   */
  const setVisible = (next: boolean) => {
    if (visible === next) return

    visible = next
    if (next) resumeLinger()
    else pauseLinger()
  }

  /**
   * Clears the run in flight: the bar goes, and so does the loading toast it
   * put up. Shared by the two ways a run ends — landing, and being called off.
   */
  const clear = (task: Task) => {
    if (task.timer !== null) clearTimeout(task.timer)
    if (current === task) current = null

    // Cleared before anything below publishes, so whichever happens next
    // already sees the bar's new state and one run means one re-render.
    if (task.toastId) dismiss(task.toastId)
  }

  /**
   * Called off: the work is told to stop, the caller is answered now rather
   * than whenever the work gets round to noticing, and nothing is said about
   * it. A user who moved on does not need a toast about what they left.
   */
  const cancel = () => {
    const task = current
    if (!task) return

    task.cancelled = true
    clear(task)
    publish()

    task.controller.abort()
    task.settle(undefined)
  }

  const run: RunAsync = <T>(
    work: Promise<T> | ((signal: AbortSignal) => Promise<T> | T),
    runOptions: RunAsyncOptions<T>
  ) => {
    /**
     * Was the palette already saying something — a run in flight, or a toast
     * still sitting in the footer? Then this run takes over on the spot, with
     * no reveal delay: the delay exists to keep a quiet palette from flashing,
     * and a palette that is already speaking has nothing left to protect. The
     * alternative is a gap where the old message is gone and the new one has
     * not arrived, which reads as the command having done nothing.
     */
    const speaking = current !== null || toast !== null

    // One at a time: whatever was running is what the user has just replaced.
    cancel()
    // And the footer belonged to it, or to the thing before it. Either way it
    // is not about what the user just asked for, so it goes now rather than
    // lingering its two and a half seconds over the top of the new run.
    dismiss()

    const task: Task = {
      id: ++sequence,
      timer: null,
      shown: false,
      toastId: null,
      controller: new AbortController(),
      settle: () => {},
      cancelled: false,
    }
    current = task

    let promise: Promise<T>
    try {
      promise = Promise.resolve(
        typeof work === "function" ? work(task.controller.signal) : work
      )
    } catch (error) {
      // A handler that threw before it ever awaited. Same outcome as a
      // rejection, minus the bar it never stayed around long enough to earn.
      promise = Promise.reject(error)
    }

    const reveal = () => {
      task.timer = null
      task.shown = true
      // One publish for both halves, so the message and the spinner it belongs
      // to arrive on the same paint rather than a frame apart.
      if (runOptions.loading) {
        task.toastId = show({ kind: "loading", title: runOptions.loading })
      }
      publish()
    }

    // No delay means none at all, rather than one turn of the event loop: a
    // caller that asked for 0 is asking to see the bar on this very tick, and
    // so is a user who just replaced one running command with another.
    if (revealMs <= 0 || speaking) reveal()
    else task.timer = setTimeout(reveal, revealMs)

    /** The caller's promise, which cancelling can answer without the work. */
    const settled = new Promise<T | undefined>((resolve) => {
      task.settle = resolve as (value: undefined) => void

      promise.then(
        (value) => {
          // Cancelled: already cleared, already answered. Whatever the work
          // went on to do is no longer anybody's business.
          if (task.cancelled) return

          const title = resolveMessage(runOptions.success, value)
          clear(task)
          if (title) show({ kind: "success", title })
          publish()
          resolve(value)
        },
        (error: unknown) => {
          if (task.cancelled) return

          const title =
            runOptions.error === undefined
              ? describeError(error)
              : resolveMessage(runOptions.error, error)

          clear(task)
          if (title) show({ kind: "error", title })
          publish()

          // The toast is for the user; this is for whoever has to fix it.
          // Only the command knows which of those a failure deserves, so the
          // palette does neither on its own.
          runOptions.onError?.(error)
          resolve(undefined)
        }
      )
    })

    return untracked(settled)
  }

  return {
    run,
    cancel,
    setVisible,
    currentRun: () => current?.id ?? null,
    toast: (input) => void show(input),
    dismissToast: (id) => dismiss(id),
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
