"use client"

import { useSyncExternalStore } from "react"

import { pendingChords, subscribePending } from "../core/keys"
import type { Chord } from "../core/keys"

/**
 * The presses a half-finished sequence is holding — `[["Mod", "D"]]` while the
 * palette waits for the L in ⌘D L, and empty the rest of the time.
 *
 * The state is module-level rather than the store's, because every key handler
 * in the palette has to agree about it; this is how the footer gets to say so.
 */
export function usePendingKeys(): readonly Chord[] {
  return useSyncExternalStore(subscribePending, pendingChords, pendingChords)
}
