"use client"

import { useEffect } from "react"

import { usePaletteStore } from "../../react"

/** How long a closed palette keeps the user's place before starting over. */
export const IDLE_RESET_MS = 30_000

/**
 * The palette is hidden rather than unmounted, so a closed stack stays exactly
 * where it was left — which is right for a quick ⌘K away and back, and wrong
 * an hour later, when the user reopens onto some page they have forgotten.
 *
 * So a closed palette forgets on a timer: back to the root, remounted — an
 * empty input, the first row highlighted, the list scrolled to the top, and
 * no leftover page state anywhere. A palette closed on an untouched root has
 * nothing to forget, and the timer costs nothing when it fires.
 * The timer runs only while closed and is cleared on open, so nothing resets
 * under an active user; passing `0` turns it off entirely.
 *
 * Must be used inside a `PaletteRoot`.
 */
export function useIdleReset(open: boolean, after: number = IDLE_RESET_MS) {
  const store = usePaletteStore()

  useEffect(() => {
    if (open || !(after > 0)) return

    const timer = setTimeout(() => store.navigation.reset(), after)
    return () => clearTimeout(timer)
  }, [open, after, store])
}
