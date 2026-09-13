/**
 * What a shortcut is written in: names, not glyphs.
 *
 * A chord is declared once and rendered per platform — ⌘⇧K on a Mac, Ctrl
 * Shift K on Windows and Linux — so the thing that is declared cannot be
 * either of those. It is the name of the key, and `Kbd` is what turns a name
 * into whatever the keyboard under the user prints on it.
 */

/**
 * Modifiers, named for what they do rather than what they print.
 *
 * `Mod` is the one to reach for: the key the platform runs commands with, ⌘ on
 * a Mac and ctrl everywhere else, which is what makes one declaration work on
 * both. `Ctrl` is the literal control key on every platform, for the rare
 * chord that means control even on a Mac.
 */
export type Modifier = "Mod" | "Shift" | "Alt" | "Ctrl"

/**
 * Everything a chord can end on. The names are `KeyboardEvent.key`'s own
 * wherever it has one, so there is nothing to translate on the way in —
 * `"ArrowUp"`, `"Enter"`, `"A"` — and `"Space"` is the one exception, because
 * its key is a space and nobody can read that in an array.
 */
export type KeyName =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z"
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "Enter"
  | "Escape"
  | "Backspace"
  | "Delete"
  | "Tab"
  | "Space"
  | "ArrowUp"
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight"
  | "Home"
  | "End"
  | "PageUp"
  | "PageDown"
  | "F1"
  | "F2"
  | "F3"
  | "F4"
  | "F5"
  | "F6"
  | "F7"
  | "F8"
  | "F9"
  | "F10"
  | "F11"
  | "F12"
  | ","
  | "."
  | "/"
  | ";"
  | "'"
  | "["
  | "]"
  | "\\"
  | "-"
  | "="
  | "`"

/**
 * One press: any number of modifiers, then exactly one key.
 *
 * The tuple is what enforces the shape — `["Mod", "Shift"]` is not a chord,
 * `["N", "Mod"]` is backwards, and both fail to compile rather than failing to
 * fire.
 */
export type Chord = readonly [...Modifier[], KeyName]

/**
 * A chord holding at least one modifier. Only these may *start* a sequence:
 * a sequence swallows the press that opens it and the one after it, and a
 * bare letter that did that would eat a character out of every other word.
 */
export type LeadChord = readonly [Modifier, ...Modifier[], KeyName]

/**
 * Presses in a row, each one on its own: `[["Mod", "D"], ["L"]]` is ⌘D, let
 * go, then L — the editor idiom, and two presses rather than one impossible
 * handful of keys.
 *
 * At least two, because a sequence of one is a chord and should be written as
 * one. After the first, the keys are the user's to choose: they are only ever
 * read while the palette is already waiting for them.
 */
export type Sequence = readonly [LeadChord, Chord, ...Chord[]]

/** What a command declares: one press, or several in a row. */
export type Shortcut = Chord | Sequence

/**
 * One drawable key. A chord is a list of these in a fixed order; a footer hint
 * is a list of them in no order at all — `["ArrowUp", "ArrowDown"]` is two
 * keys to press separately, not a chord.
 */
export type KeyToken = Modifier | KeyName
