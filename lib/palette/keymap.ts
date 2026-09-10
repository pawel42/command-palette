/** The subset of KeyboardEvent the keymap needs, so it can be tested plainly. */
export type KeyEvent = {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
}

export type ListIntent =
  | { type: "move"; direction: 1 | -1 }
  | { type: "edge"; edge: "first" | "last" }
  | { type: "select" }
  | { type: "escape" }

export function resolveKey(event: KeyEvent): ListIntent | null {
  switch (event.key) {
    case "ArrowDown":
      return { type: "move", direction: 1 }
    case "ArrowUp":
      return { type: "move", direction: -1 }
    case "Home":
      return { type: "edge", edge: "first" }
    case "End":
      return { type: "edge", edge: "last" }
    case "Enter":
      return { type: "select" }
    case "Escape":
      return { type: "escape" }
    default:
      return null
  }
}

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
