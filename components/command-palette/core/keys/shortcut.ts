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
