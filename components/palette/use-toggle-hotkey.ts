"use client"

import { useEffect, useRef } from "react"

import { matchesShortcut } from "@/lib/palette"

/** ⌘K on a Mac, ctrl+K everywhere else. */
export const TOGGLE_SHORTCUT = ["⌘", "K"] as const

/**
 * Global toggle. It listens on the window so it works whether the palette is
 * open or closed, and preventDefault stops the browser's own ⌘K.
 *
 * Auto-repeats are dropped: holding the combo would otherwise flip the palette
 * open and shut many times a second. One press, one toggle.
 */
export function useToggleHotkey(toggle: () => void) {
  // Read through a ref so a fresh callback each render doesn't resubscribe.
  const toggleRef = useRef(toggle)

  useEffect(() => {
    toggleRef.current = toggle
  }, [toggle])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const hit =
        matchesShortcut(["⌘", "K"], event) || matchesShortcut(["⌃", "K"], event)
      if (!hit) return

      // Still swallow the browser's own ⌘K on repeats, just don't act on them.
      event.preventDefault()
      if (event.repeat) return

      toggleRef.current()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
}
