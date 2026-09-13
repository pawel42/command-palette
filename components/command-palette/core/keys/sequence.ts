/**
 * Shortcuts that take more than one press — ⌘D, then L.
 *
 * The whole mechanism is one piece of state: the presses made so far, while
 * they are still a prefix of something that could fire. It lives here, module
 * level, rather than in the store, because every key handler in the palette
 * has to agree about it — the list's, the frame's — and they run on different
 * elements on the way up from one press.
 *
 * What is remembered is the *presses*, not the command they might belong to.
 * Two commands can share a lead chord, so choosing between them before the
 * second press is choosing too early; instead each handler asks, of its own
 * items, "does this one's sequence start with what has been pressed and
 * continue with this?" — which needs no ownership at all.
 */

import type { KeyEvent } from "./intent"
import { matchesShortcut } from "./shortcut"
import type { Chord, Sequence, Shortcut } from "./tokens"

/**
 * How long the palette waits for the rest of a sequence. Long enough to reach
 * for a second key, short enough that a forgotten prefix does not silently eat
 * the next thing typed — and the footer says so for the whole of it.
 */
export const SEQUENCE_MS = 2000

/** Only what a chord is matched against, so a press can be kept as data. */
type Press = Required<
  Pick<KeyEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">
>

/**
 * The presses made, and the chords to draw for them.
 *
 * Two views of the same thing, and both are needed: matching reads the presses
 * — the raw truth about what was held down — while the footer draws the chords
 * the sequence declared, which is where "Mod" comes from and therefore the
 * only way the footer can say ⌘D rather than guess at it.
 */
type Pending = { presses: readonly Press[]; chords: readonly Chord[] }

const NOTHING: Pending = { presses: [], chords: [] }

const listeners = new Set<() => void>()
let pending: Pending = NOTHING
let timer: ReturnType<typeof setTimeout> | null = null

function announce() {
  for (const listener of listeners) listener()
}

export function subscribePending(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * The chords the palette is holding, if it is waiting on more — empty when it
 * is not. Stable between changes, as `useSyncExternalStore` requires.
 */
export function pendingChords(): readonly Chord[] {
  return pending.chords
}

export function clearPending() {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
  if (pending.presses.length === 0) return

  pending = NOTHING
  announce()
}

function hold(presses: readonly Press[], chords: readonly Chord[]) {
  if (timer !== null) clearTimeout(timer)

  pending = { presses, chords }
  timer = setTimeout(clearPending, SEQUENCE_MS)
  announce()
}

function press(event: KeyEvent): Press {
  return {
    key: event.key,
    metaKey: Boolean(event.metaKey),
    ctrlKey: Boolean(event.ctrlKey),
    altKey: Boolean(event.altKey),
    shiftKey: Boolean(event.shiftKey),
  }
}

/** A sequence is the nested one; a chord is a flat list of names. */
export function isSequence(shortcut: Shortcut): shortcut is Sequence {
  return Array.isArray(shortcut[0])
}

/** Either kind, as the list of presses it takes. */
export function chordsOf(shortcut: Shortcut): readonly Chord[] {
  return isSequence(shortcut) ? shortcut : [shortcut as Chord]
}

/** Does this sequence open with exactly the presses already made? */
function continues(shortcut: Shortcut, made: readonly Press[]): boolean {
  const chords = chordsOf(shortcut)
  if (chords.length <= made.length) return false

  return made.every((event, index) => matchesShortcut(chords[index], event))
}

export type ShortcutOutcome<T> =
  /** Run it. */
  | { type: "run"; item: T }
  /** The press opened or advanced a sequence: it belongs to the palette now. */
  | { type: "pending" }
  /** Something was pending and this press is not it. Spent, and nothing ran. */
  | { type: "cancel" }
  /**
   * Something is pending, this caller cannot finish it, and another one still
   * might — so the press is neither spent nor free. Act on it no further and
   * let it carry on to whoever is asked last.
   */
  | { type: "miss" }
  /** Not ours. */
  | { type: "none" }

export type ResolveOptions<T> = {
  /** Which items may fire at all, beyond simply carrying a shortcut. */
  eligible?: (item: T) => boolean
  /**
   * Whether this caller is the last one to see the press. Only the last may
   * end a sequence: the palette asks more than one set of items about the same
   * press — a page's rows, then its footer's actions — and the first to find
   * nothing is not evidence that nothing matches.
   */
  final?: boolean
}

/**
 * What one press means, against a list of things that might have shortcuts.
 *
 * Anything but `"none"` means the press was spent here and the caller should
 * preventDefault — including `"cancel"`, because a press that ends a sequence
 * must not also land in whatever has focus.
 */
export function resolveShortcut<T extends { shortcut?: Shortcut }>(
  items: readonly T[],
  event: KeyEvent,
  { eligible = () => true, final = true }: ResolveOptions<T> = {}
): ShortcutOutcome<T> {
  const made = pending.presses
  const candidates = items.filter(
    (item) => item.shortcut !== undefined && eligible(item)
  )

  if (made.length > 0) {
    const next = [...made, press(event)]

    const hit = candidates.find((item) => {
      const chords = chordsOf(item.shortcut!)
      return (
        chords.length === next.length &&
        next.every((made, index) => matchesShortcut(chords[index], made))
      )
    })

    if (hit) {
      clearPending()
      return { type: "run", item: hit }
    }

    // Still on the way to something longer: hold what has been pressed, and
    // draw it as the sequence that is still in play spells it.
    const longer = candidates.find((item) => continues(item.shortcut!, next))
    if (longer) {
      hold(next, chordsOf(longer.shortcut!).slice(0, next.length))
      return { type: "pending" }
    }

    // The lead pressed again is someone starting over, not someone missing:
    // ⌘D ⌘D L runs what ⌘D L runs, rather than locking the second press out.
    const restart = candidates.find((item) =>
      continues(item.shortcut!, [press(event)])
    )
    if (restart) {
      hold([press(event)], chordsOf(restart.shortcut!).slice(0, 1))
      return { type: "pending" }
    }

    if (!final) return { type: "miss" }

    clearPending()
    return { type: "cancel" }
  }

  const direct = candidates.find(
    (item) =>
      !isSequence(item.shortcut!) && matchesShortcut(item.shortcut!, event)
  )
  if (direct) return { type: "run", item: direct }

  const made1 = [press(event)]
  const opens = candidates.find((item) => continues(item.shortcut!, made1))
  if (opens) {
    hold(made1, chordsOf(opens.shortcut!).slice(0, 1))
    return { type: "pending" }
  }

  return { type: "none" }
}
