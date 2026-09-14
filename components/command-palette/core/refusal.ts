/**
 * Refusals: the palette answering no.
 *
 * A refusal is a press that was understood and not carried out — ⌘↵ on a form
 * whose values are wrong is the one this was written for. It is neither a
 * failure nor work: nothing threw, nothing is pending, and there is nothing to
 * say that the page has not already said beside the field that is wrong. What
 * is missing is only the answer to the press itself, which is why nothing here
 * carries a message. A count is the whole of it, and what to make of one — the
 * dialog shakes — belongs to whoever draws the palette.
 *
 * A plain store, like `async.ts`. No React in this folder.
 */

export type Refusals = {
  /** Records one. Nothing else happens; see above. */
  refuse: () => void
  /**
   * How many there have been. A count and not a flag, because two refusals in
   * a row are two presses to answer, and a flag that is already set cannot
   * tell the second one from a second one that never came — a user pressing
   * ⌘↵ twice on an unchanged form has to be answered twice.
   */
  getSnapshot: () => number
  subscribe: (listener: () => void) => () => void
}

export function createRefusals(): Refusals {
  const listeners = new Set<() => void>()
  let count = 0

  return {
    refuse: () => {
      count += 1
      for (const listener of listeners) listener()
    },
    getSnapshot: () => count,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
