import type { KeyEvent } from "./intent"
import { commandModifier, getPlatform } from "./platform"
import type { Platform } from "./platform"
import type { Chord, Modifier } from "./tokens"

const MODIFIERS = new Set<string>(["Mod", "Shift", "Alt", "Ctrl"])

/** Which flag on the event a modifier stands for, here. */
function flagOf(modifier: Modifier, platform: Platform): keyof KeyEvent {
  switch (modifier) {
    case "Mod":
      return commandModifier(platform)
    case "Ctrl":
      return "ctrlKey"
    case "Alt":
      return "altKey"
    case "Shift":
      return "shiftKey"
  }
}

/**
 * `KeyboardEvent.key` for a key name. They are the same string for everything
 * the browser gives a name to — the names were chosen that way — so this is
 * the one that has to be spelled out.
 */
function eventKey(name: string): string {
  return (name === "Space" ? " " : name).toLowerCase()
}

/**
 * Matches a declared chord against a key event: `["Mod", "N"]` is ⌘N on a Mac
 * and ctrl+N on Windows and Linux, off the one declaration.
 *
 * The modifiers not named are required to be *up*, which is what keeps ⌘N and
 * ⌘⇧N apart — and, on Windows, keeps the Windows key out of a ctrl chord.
 */
export function matchesShortcut(
  shortcut: Chord,
  event: KeyEvent,
  platform: Platform = getPlatform()
): boolean {
  const required = new Set<keyof KeyEvent>()
  let key: string | null = null

  for (const part of shortcut) {
    if (MODIFIERS.has(part)) {
      required.add(flagOf(part as Modifier, platform))
      continue
    }
    key = eventKey(part)
  }

  if (key === null || key !== event.key.toLowerCase()) return false

  return (["metaKey", "ctrlKey", "altKey", "shiftKey"] as const).every(
    (modifier) => Boolean(event[modifier]) === required.has(modifier)
  )
}

/** ⌘K on a Mac, ctrl+K everywhere else — one chord, resolved per platform. */
export const TOGGLE_SHORTCUT: Chord = ["Mod", "K"]

/** The footer's action panel. Chrome, and not a page's to move. */
export const ACTIONS_SHORTCUT: Chord = ["Mod", "Shift", "K"]

/**
 * The two the palette keeps for itself. A page that declares one of them gets
 * the palette's behavior, not its own — matched before any page action.
 */
export const RESERVED_SHORTCUTS: readonly Chord[] = [
  TOGGLE_SHORTCUT,
  ACTIONS_SHORTCUT,
]

/** Matches any of several chords — what a list of reserved ones needs. */
export function matchesAny(
  shortcuts: readonly Chord[],
  event: KeyEvent
): boolean {
  return shortcuts.some((shortcut) => matchesShortcut(shortcut, event))
}
