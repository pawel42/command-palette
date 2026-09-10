/**
 * One press, one action. Both rules here exist because a single physical
 * key press reaches more than one handler, and only one of them may act.
 */

import type { KeyEvent } from "./intent"

/** Presses already spent on an unwind. Keyed by the native event, which is the
 *  one object every handler along the bubble path shares. */
const claimedEscapes = new WeakSet<object>()

/**
 * One press, one unwind.
 *
 * A page's key handler runs on the frame's input and the frame's own esc rule
 * runs on the box around it, so a single press reaches both — and the frame
 * can't skip an already-prevented event, because the surrounding dialog
 * prevents esc in the capture phase before either has seen it. So the press
 * itself is claimed: the first handler to take it unwinds, and the next one
 * finds it spent and leaves it alone.
 */
export function claimEscape(event: { nativeEvent: object }): boolean {
  if (claimedEscapes.has(event.nativeEvent)) return false

  claimedEscapes.add(event.nativeEvent)
  return true
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
