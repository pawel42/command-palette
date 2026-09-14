"use client"

import { useEffect, useRef } from "react"
import type { RefObject } from "react"

import { useRefusals } from "../../react"

/** How long one shake lasts, in milliseconds. */
export const SHAKE_MS = 400

/**
 * The travel, as four decaying excursions.
 *
 * Horizontal only, and small. A dialog that jumps vertically drags the eye off
 * the line it was reading, and a large travel reads as a fault in the
 * application rather than as an answer to a keypress. `transform` is safe even
 * though the dialog is *centred* by a translation: Tailwind v4 emits
 * `-translate-x-1/2` as the `translate` property, so the two compose instead
 * of fighting and the dialog shakes about where it stands.
 */
const KEYFRAMES: readonly Keyframe[] = [
  { transform: "translateX(0)", offset: 0 },
  { transform: "translateX(-6px)", offset: 0.15 },
  { transform: "translateX(5px)", offset: 0.35 },
  { transform: "translateX(-3px)", offset: 0.55 },
  { transform: "translateX(2px)", offset: 0.75 },
  { transform: "translateX(0)", offset: 1 },
]

const EASING = "cubic-bezier(0.36, 0.07, 0.19, 0.97)"

/** Whether the reader has asked the system for less animation. */
function prefersReducedMotion(): boolean {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  )
}

/**
 * Shakes the dialog once for every refusal the store records — see
 * `core/refusal.ts`, and `useFormPage` for the one that records them.
 *
 * **Driven from script rather than from a CSS class, and both reasons were
 * measured on the real dialog rather than reasoned about.** The dialog
 * permanently carries `data-[state=open]:animate-in` from `tw-animate-css`,
 * which sets `animation-name: enter` — and `enter` animates `transform`, so a
 * class-based shake has to fight that property for the element:
 *
 * 1. **It loses.** That rule's selector carries an attribute, so inside
 *    Tailwind's utilities layer it outranks a plain utility class —
 *    `getComputedStyle` still reported `enter` with the shake class applied,
 *    and the shake never played at all.
 * 2. **Winning is worse.** Declared unlayered it does win — and then
 *    *removing* it puts `enter` back as a name that was absent a moment ago,
 *    which is the definition of a new CSS animation. The dialog replayed its
 *    150ms fade-and-zoom every time a shake finished: a flash after every
 *    refusal.
 *
 * A script animation never touches the `animation` property, so `enter` is
 * neither overridden nor re-created; it simply stays finished, and a script
 * animation outranks a CSS one for as long as it runs. It also restarts
 * cleanly, which the palette genuinely needs — a user pressing ⌘↵ twice on an
 * unchanged form has to be answered twice, and the previous animation is
 * cancelled by this effect's own cleanup before the next one starts.
 *
 * Two guards, both silent: an element whose browser has no Web Animations API
 * and a reader who has asked for reduced motion both get no animation. Nothing
 * is lost in either case — the field messages carry `role="alert"` and are the
 * actual answer; the shake only draws the eye back to them.
 *
 * @param target - The element to shake: the dialog itself.
 */
export function usePaletteShake(target: RefObject<HTMLElement | null>): void {
  const refusals = useRefusals()
  const seen = useRef(refusals)

  useEffect(() => {
    // Equal on the first run after mount, which is every mount: the count the
    // dialog opened its eyes on is not a refusal it has to answer. Lower is
    // guarded rather than assumed away — the count only ever climbs, so a
    // fall would mean a store this hook has never seen, and a dialog that
    // shook itself over that would be reporting something that never happened.
    if (refusals <= seen.current) {
      seen.current = refusals
      return
    }
    seen.current = refusals

    const node = target.current
    if (!node || typeof node.animate !== "function") return
    if (prefersReducedMotion()) return

    const animation = node.animate([...KEYFRAMES], {
      duration: SHAKE_MS,
      easing: EASING,
    })

    return () => animation.cancel()
  }, [refusals, target])
}
