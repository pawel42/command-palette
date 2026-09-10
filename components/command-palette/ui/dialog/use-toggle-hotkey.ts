"use client"

import { useEffect, useRef } from "react"

import { matchesShortcut } from "../../core"

/** ⌘K on a Mac, ctrl+K everywhere else. The first is what the UI displays. */
export const TOGGLE_SHORTCUT: readonly (readonly string[])[] = [
  ["⌘", "K"],
  ["⌃", "K"],
]

/**
 * Global toggle. It listens on the window so it works whether the palette is
 * open or closed, and preventDefault stops the browser's own ⌘K.
 *
 * Auto-repeats are dropped: holding the combo would otherwise flip the palette
 * open and shut many times a second. One press, one toggle.
 */
export function useToggleHotkey(
  toggle: () => void,
  shortcuts: readonly (readonly string[])[] = TOGGLE_SHORTCUT
) {
  // Read through refs so a fresh callback or array each render doesn't resubscribe.
  const toggleRef = useRef(toggle)
  const shortcutsRef = useRef(shortcuts)

  useEffect(() => {
    toggleRef.current = toggle
    shortcutsRef.current = shortcuts
  }, [toggle, shortcuts])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const hit = shortcutsRef.current.some((shortcut) =>
        matchesShortcut(shortcut, event)
      )
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
