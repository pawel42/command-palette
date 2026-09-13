import { type Platform, getPlatform } from "./platform"
import { chordsOf } from "./sequence"
import type { KeyToken, Modifier, Shortcut } from "./tokens"

/**
 * What a Mac prints on the key. Letters, digits and punctuation are their own
 * label and are left out; esc is the one glyph nobody draws, because ⎋ is not
 * what is written on the keycap.
 */
const MAC_KEYS: Partial<Record<KeyToken, string>> = {
  Mod: "⌘",
  Shift: "⇧",
  Alt: "⌥",
  Ctrl: "⌃",
  Enter: "↵",
  Escape: "esc",
  Backspace: "⌫",
  Delete: "⌦",
  Tab: "⇥",
  Space: "␣",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  PageUp: "⇞",
  PageDown: "⇟",
}

/**
 * What a Windows or Linux keyboard prints instead: words, mostly. Drawing ⌥
 * there asks the user to translate, and drawing ⌘ is worse than
 * untranslatable — the key it names is not the key that works.
 *
 * The arrows stay glyphs because every keyboard prints those.
 */
const PC_KEYS: Partial<Record<KeyToken, string>> = {
  Mod: "Ctrl",
  Shift: "Shift",
  Alt: "Alt",
  Ctrl: "Ctrl",
  Enter: "Enter",
  Escape: "Esc",
  Backspace: "Backspace",
  Delete: "Del",
  Tab: "Tab",
  Space: "Space",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  PageUp: "PgUp",
  PageDown: "PgDn",
}

/**
 * The order modifiers are read in, which is not the order they are declared
 * in: a Mac writes ⌃⌥⇧⌘ and Windows writes Ctrl+Alt+Shift, whatever order the
 * chord was typed into the array. `Mod` sorts where the key it stands for
 * sorts — last on a Mac, first everywhere else.
 */
const MAC_ORDER: Record<Modifier, number> = {
  Ctrl: 0,
  Alt: 1,
  Shift: 2,
  Mod: 3,
}
const PC_ORDER: Record<Modifier, number> = { Mod: 0, Ctrl: 0, Alt: 1, Shift: 2 }

function isModifier(key: KeyToken): key is Modifier {
  return key === "Mod" || key === "Shift" || key === "Alt" || key === "Ctrl"
}

/**
 * Modifiers into reading order, everything else left exactly where it is —
 * a hint's `["ArrowUp", "ArrowDown"]` is two keys in the order it listed them,
 * not a chord to be tidied.
 */
function ordered(
  keys: readonly KeyToken[],
  platform: Platform
): readonly KeyToken[] {
  const rank = platform === "mac" ? MAC_ORDER : PC_ORDER
  const modifiers = keys.filter(isModifier).sort((a, b) => rank[a] - rank[b])
  if (modifiers.length < 2) return keys

  return [...modifiers, ...keys.filter((key) => !isModifier(key))]
}

/** One key as this platform's keyboard prints it. Anything unlisted is its own label. */
export function formatKey(key: string, platform: Platform = getPlatform()) {
  const keys = platform === "mac" ? MAC_KEYS : PC_KEYS

  return keys[key as KeyToken] ?? key
}

/**
 * A whole chord, key by key, in reading order — what the footer and the rows
 * draw one box each of. `["Shift", "Mod", "K"]` and `["Mod", "Shift", "K"]`
 * are the same chord and come out here as the same three boxes.
 */
export function formatShortcut(
  keys: readonly KeyToken[],
  platform: Platform = getPlatform()
): string[] {
  return ordered(keys, platform).map((key) => formatKey(key, platform))
}

/**
 * The chord as `aria-keyshortcuts` wants it: modifiers first — which is the
 * order they are declared in anyway — joined with `+`, and naming the key that
 * actually fires here rather than both of the keys that might.
 *
 * Everything else is already spelled the way the attribute wants it, which is
 * `KeyboardEvent.key`'s spelling, which is what the names are.
 */
export function ariaKeyShortcut(
  keys: readonly KeyToken[],
  platform: Platform = getPlatform()
): string {
  return ordered(keys, platform)
    .map((key) => {
      if (key === "Mod") return platform === "mac" ? "Meta" : "Control"
      if (key === "Ctrl") return "Control"

      return key
    })
    .join("+")
}

/**
 * A shortcut as the boxes to draw for it: one group per press, so ⌘D-then-L
 * comes out as `[["⌘", "D"], ["L"]]` and is drawn as two groups with air
 * between them rather than four keys in a row that look like one impossible
 * chord.
 */
export function formatChords(
  shortcut: Shortcut,
  platform: Platform = getPlatform()
): string[][] {
  return chordsOf(shortcut).map((chord) => formatShortcut(chord, platform))
}
