/** The subset of KeyboardEvent the keymap needs, so it can be reasoned about plainly. */
export type KeyEvent = {
  key: string
  /** True for the auto-repeats a held key produces. */
  repeat?: boolean
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

export type BackspaceContext = {
  /** Text in the palette input; "" when the page has no editable one. */
  query: string
  /** There is nothing below this page to go back to. */
  isRoot: boolean
  /** An earlier press in this same key burst already deleted text. */
  consumedByDelete: boolean
  /** Focus is inside some other field, which owns the key. */
  inTypingField?: boolean
}

export type BackspaceOutcome =
  /** Leave it to the browser: the press is spent deleting a character. */
  | "delete"
  /** Unwind, exactly as esc would. */
  | "back"
  /** Do nothing at all. */
  | "ignore"

/**
 * Backspace doubles as "go back", which only works with a guard: holding the
 * key to clear the input must empty it and stop there, so going back always
 * takes a fresh press.
 *
 * `consumedByDelete` is what makes that work — the caller sets it when a press
 * deletes text and clears it on keyup, which never happens mid-burst. The
 * `repeat` check covers the gap right after a page pops, when focus moves to a
 * new input while the key is still down.
 */
export function resolveBackspace(
  event: KeyEvent,
  ctx: BackspaceContext
): BackspaceOutcome {
  if (event.key !== "Backspace") return "ignore"

  if (ctx.query !== "" || ctx.inTypingField) return "delete"

  if (ctx.consumedByDelete || event.repeat || ctx.isRoot) return "ignore"

  return "back"
}
