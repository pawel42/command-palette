"use client"

import type { PageFooter } from "../../core"
import { usePublishFooter } from "../internal/bridge"

/**
 * Publish this page's footer from inside it — the hints beside the frame's
 * own, and the actions behind ⌘⇧K.
 *
 * The same value a page's own `footer` takes, handed over at a later moment:
 * this is the form for a footer that depends on the page's own React state, a
 * view toggle or a Save that reads a draft, which the definition cannot see.
 * Later costs a render — the frame has already painted by the time an effect
 * runs — so anything knowable at definition time belongs on the definition.
 *
 * Whoever declares the footer declares all of it. This replaces the page's
 * config footer rather than adding to it: a hint merged in from another file
 * is a hint nobody can find.
 */
export function usePageFooter(footer: PageFooter): void {
  usePublishFooter("page", footer)
}
