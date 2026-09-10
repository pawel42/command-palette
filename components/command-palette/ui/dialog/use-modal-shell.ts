"use client"

import { useEffect } from "react"

/**
 * What Radix's `modal` used to do for us, done by hand.
 *
 * The dialog runs non-modal so its content can stay mounted while closed —
 * modal content aria-hides the rest of the app from a mount-only effect, which
 * would outlive the close and leave the page hidden from assistive tech. While
 * the palette is open, `inert` on the app shell covers both of that mode's
 * jobs at once: the app behind is unfocusable and invisible to a screen
 * reader. The palette is portalled to the body, outside the shell, so it stays
 * live.
 *
 * Focus is put back where it came from on close, which is the other thing the
 * dialog can no longer do for us now that it never unmounts. Keeping focus in
 * while it is open is the frame's job — see `wrapTabFocus`.
 *
 * The host has to mark its own shell — everything the palette should cover —
 * with `data-app-shell`, or pass a different selector.
 */
export function useModalShell(
  open: boolean,
  { shellSelector = "[data-app-shell]" }: { shellSelector?: string } = {}
) {
  useEffect(() => {
    if (!open) return

    const shell = document.querySelector(shellSelector)
    const previouslyFocused = document.activeElement
    const { overflow } = document.body.style

    shell?.toggleAttribute("inert", true)
    document.body.style.overflow = "hidden"

    return () => {
      shell?.toggleAttribute("inert", false)
      document.body.style.overflow = overflow

      if (
        previouslyFocused instanceof HTMLElement &&
        previouslyFocused.isConnected
      ) {
        previouslyFocused.focus()
      }
    }
  }, [open, shellSelector])
}
