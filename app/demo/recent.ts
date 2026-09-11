"use client"

/**
 * What was run lately, newest first — the list behind the root's "Recent"
 * section. An external store for the same reason the activity log is one:
 * writes arrive from the palette's `onCommand`, outside React.
 *
 * It is module state, so it outlives a close and the idle `nav.reset()` that
 * eventually starts the stack over — which is the whole point of a recents
 * list. A reload forgets it; nothing in this showcase touches the browser's
 * storage.
 */

export const RECENT_LIMIT = 3

let ids: readonly string[] = []
const listeners = new Set<() => void>()

/** Moves an id to the front, dropping the oldest past the limit. */
export function rememberCommand(id: string) {
  ids = [id, ...ids.filter((kept) => kept !== id)].slice(0, RECENT_LIMIT)
  for (const listener of listeners) listener()
}

export function subscribeRecent(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Stable between writes, as `useSyncExternalStore` requires. */
export function recentIds(): readonly string[] {
  return ids
}
