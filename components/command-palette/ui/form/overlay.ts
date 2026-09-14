"use client"

import { claimEscape } from "../../core"

/**
 * Spread onto any Radix overlay opened from inside a palette page —
 * `SelectContent`, `PopoverContent`, a combobox's list.
 *
 *   <SelectContent {...claimsEscape}>
 *
 * Without it, one press of esc does two things. Radix's `DismissableLayer`
 * listens for esc on the document in the *capture* phase and only on the
 * topmost layer, so the open dropdown closes itself first; the press then
 * carries on bubbling to the palette frame, which reads esc before its own
 * `defaultPrevented` guard — deliberately, because the palette's wrapping
 * dialog has already marked the event by then. So the dropdown shuts *and*
 * the page unwinds, and the user loses a form they only meant to close a menu
 * on.
 *
 * `claimEscape` is the seam the palette exports for exactly this: the first
 * caller to claim a press owns it, and everything downstream stands down.
 * Radix hands `onEscapeKeyDown` the native event, which is the same object
 * the frame will later read off its synthetic one — so the claim lands.
 *
 * Not preventing the event is the other half: Radix dismisses the layer only
 * when its `onEscapeKeyDown` left the press alone, which is what still closes
 * the dropdown.
 */
export const claimsEscape = {
  onEscapeKeyDown: (event: KeyboardEvent) => {
    claimEscape({ nativeEvent: event })
  },
}
