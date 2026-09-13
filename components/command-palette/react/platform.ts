"use client"

import { useSyncExternalStore } from "react"

import { DEFAULT_PLATFORM, getPlatform } from "../core/keys"
import type { Platform } from "../core/keys"

/** Nothing to subscribe to: the keyboard under the user does not change. */
const subscribe = () => () => {}

/**
 * Which keyboard to draw for — see `Kbd`, which is the one place that asks.
 *
 * Through `useSyncExternalStore` rather than an effect, because the server
 * renders these keys too: the snapshot it hydrates against is the declared
 * spelling, and React swaps in the real platform on the first client render
 * instead of warning about a mismatch. A Mac never moves; everywhere else
 * `Mod` becomes Ctrl before the palette can be read.
 */
export function usePlatform(): Platform {
  return useSyncExternalStore(subscribe, getPlatform, () => DEFAULT_PLATFORM)
}
