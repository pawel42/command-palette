import type { KeyEvent } from "./intent"

const MODIFIERS: Record<string, keyof KeyEvent> = {
  "⌘": "metaKey",
  "⌃": "ctrlKey",
  "⌥": "altKey",
  "⇧": "shiftKey",
}

const KEY_ALIASES: Record<string, string> = {
  "↵": "enter",
  "⏎": "enter",
  "⌫": "backspace",
  "⌦": "delete",
  "⎋": "escape",
  "⇥": "tab",
  "␣": " ",
  "↑": "arrowup",
  "↓": "arrowdown",
  "←": "arrowleft",
  "→": "arrowright",
}

/** Matches a display shortcut like ["⌘", "N"] against a key event. */
export function matchesShortcut(
  shortcut: readonly string[],
  event: KeyEvent
): boolean {
  const required = new Set<keyof KeyEvent>()
  let key: string | null = null

  for (const part of shortcut) {
    const modifier = MODIFIERS[part]
    if (modifier) {
      required.add(modifier)
      continue
    }
    key = KEY_ALIASES[part] ?? part.toLowerCase()
  }

  if (key === null || key !== event.key.toLowerCase()) return false

  return (["metaKey", "ctrlKey", "altKey", "shiftKey"] as const).every(
    (modifier) => Boolean(event[modifier]) === required.has(modifier)
  )
}

/** ⌘K on a Mac, ctrl+K everywhere else. The first is what the UI displays. */
export const TOGGLE_SHORTCUT: readonly (readonly string[])[] = [
  ["⌘", "K"],
  ["⌃", "K"],
]

/** ⌘⇧K: the footer's action panel. Chrome, and not a page's to move. */
export const ACTIONS_SHORTCUT: readonly (readonly string[])[] = [
  ["⌘", "⇧", "K"],
  ["⌃", "⇧", "K"],
]

/**
 * The two the palette keeps for itself. A page that declares one of them gets
 * the palette's behavior, not its own — matched before any page action.
 */
export const RESERVED_SHORTCUTS: readonly (readonly string[])[] = [
  ...TOGGLE_SHORTCUT,
  ...ACTIONS_SHORTCUT,
]

/**
 * Matches any of several spellings of one chord — what a ⌘-on-a-Mac,
 * ctrl-everywhere-else pair always needs.
 */
export function matchesAny(
  shortcuts: readonly (readonly string[])[],
  event: KeyEvent
): boolean {
  return shortcuts.some((shortcut) => matchesShortcut(shortcut, event))
}
