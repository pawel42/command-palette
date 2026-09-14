"use client"

import { useSyncExternalStore } from "react"

import { usePaletteStore } from "./context"

/**
 * The React side of `core/refusal.ts`: one hook to record a refusal, one to
 * read them. What a refusal is, and why it carries no message, is written up
 * there.
 */

/**
 * Records a refusal — a press the palette understood and did not carry out.
 * The dialog answers it with a shake; see `usePaletteShake`.
 *
 * ```tsx
 * const refuse = useRefuse()
 * ```
 *
 * The returned function is the store's own and never changes identity, so it
 * is safe in a dependency array.
 */
export function useRefuse(): () => void {
  return usePaletteStore().refusals.refuse
}

/**
 * How many refusals the palette has recorded, for whoever answers one — which
 * is the dialog, and normally nothing else.
 */
export function useRefusals(): number {
  const { refusals } = usePaletteStore()

  return useSyncExternalStore(
    refusals.subscribe,
    refusals.getSnapshot,
    refusals.getSnapshot
  )
}
