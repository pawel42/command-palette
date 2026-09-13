"use client"

import { useEffect, useRef } from "react"

import { TOGGLE_SHORTCUT, matchesAny } from "../../core"
import type { Chord } from "../../core"

/** ⌘K on a Mac, ctrl+K everywhere else — one chord, resolved per platform. */
export { TOGGLE_SHORTCUT }

/** The default, module-level so a host that takes it doesn't get a new array. */
const DEFAULT_SHORTCUTS: readonly Chord[] = [TOGGLE_SHORTCUT]

/**
 * Global toggle. It listens on the window so it works whether the palette is
 * open or closed, and preventDefault stops the browser's own ⌘K.
 *
 * Auto-repeats are dropped: holding the combo would otherwise flip the palette
 * open and shut many times a second. One press, one toggle.
 */
export function useToggleHotkey(
  toggle: () => void,
  /** Any of these opens the palette; each is one chord of key names. */
  shortcuts: readonly Chord[] = DEFAULT_SHORTCUTS
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
      if (!matchesAny(shortcutsRef.current, event)) return

      // Still swallow the browser's own ⌘K on repeats, just don't act on them.
      event.preventDefault()
      if (event.repeat) return

      toggleRef.current()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
}
