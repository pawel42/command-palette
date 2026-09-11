"use client"

import { useEffect, useSyncExternalStore } from "react"

import type { AsyncSnapshot, RunAsync, ToastInput } from "../core"
import { usePaletteStore } from "./context"

/**
 * The React side of `core/async.ts`, for everything that is not a command.
 *
 * A command handler already has both of these on its context and needs none of
 * this. These are for a page's own React code — a button's onClick, an effect
 * that loads something, a hook the page keeps its behavior in — so that work
 * started from inside a page reports itself exactly the way a command's does.
 */

/**
 * Run work with the palette's progress bar and its outcome toasts.
 *
 * ```tsx
 * const runAsync = useRunAsync()
 *
 * const save = () =>
 *   runAsync(() => api.save(draft), {
 *     loading: "Saving…",
 *     success: (task) => `Saved “${task.title}”`,
 *     error: "Couldn't save that",
 *   })
 * ```
 *
 * The returned function is the store's own and never changes identity, so it
 * is safe in a dependency array.
 */
export function useRunAsync(): RunAsync {
  return usePaletteStore().tasks.run
}

/** The same footer line, with no work behind it: "Copied", "Nothing to push". */
export function useToast(): (input: ToastInput) => void {
  return usePaletteStore().tasks.toast
}

/**
 * Marks the palette as on screen for as long as the calling component is
 * mounted. `PaletteSurface` calls it; nothing else should have to.
 *
 * It is what keeps a toast's dismiss timer from running in a closed palette.
 * Mounting and unmounting are exactly the right pair of moments: a host that
 * unmounts its surface tears this effect down, and so does one that merely
 * hides it, because `Activity` unmounts the effects of a hidden tree while
 * keeping its state.
 */
export function usePaletteVisible(): void {
  const { tasks } = usePaletteStore()

  useEffect(() => {
    tasks.setVisible(true)
    return () => tasks.setVisible(false)
  }, [tasks])
}

/**
 * What the palette is doing, for whoever draws it — which is the frame, and
 * normally nothing else.
 */
export function usePaletteTasks(): AsyncSnapshot {
  const { tasks } = usePaletteStore()

  return useSyncExternalStore(
    tasks.subscribe,
    tasks.getSnapshot,
    tasks.getSnapshot
  )
}
