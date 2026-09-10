"use client"

import { useSyncExternalStore } from "react"

/**
 * A one-line "what just happened" log, so action commands have something
 * visible to do in the showcase. It's an external store for the same reason
 * the palette is: writes come from command handlers, outside React.
 */

let entries: readonly string[] = []
const listeners = new Set<() => void>()

export function logActivity(message: string) {
  entries = [message, ...entries].slice(0, 4)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => entries

export function useActivity(): readonly string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
