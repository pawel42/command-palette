import type { Command } from "../command/types"
import type { PageContext } from "./types"

/**
 * A key legend with nothing behind it: "esc discards this draft".
 *
 * Strings, deliberately. `label` is not a `ReactNode` and `keys` are not
 * elements, so a hint can never quietly become a slot the page draws chrome
 * into. A key that *does* something is an action instead, and shows its own
 * chord in the panel.
 */
export type FooterHint = {
  keys: readonly string[]
  label: string
}

/**
 * The one thing a page may put in the palette's chrome — see `NoHeader` for
 * the other half of that rule.
 *
 * `actions` are the page's commands: listed in the ⌘⇧K panel, searchable
 * there, and the ones carrying a `shortcut` fire from the page itself without
 * opening it. Order is meaningful — the panel opens on the first.
 *
 * Two fields, and there is deliberately no third: the footer is a config, not
 * a render slot. Anything that needs markup belongs in the page body.
 */
export type PageFooter = {
  actions?: readonly Command[]
  hints?: readonly FooterHint[]
}

/** A footer, or a footer built from the page's context. */
export type FooterInput<Props = unknown, Result = unknown> =
  PageFooter | ((ctx: PageContext<Props, Result>) => PageFooter)

/** Stable identity, so "no footer" is never a reason to re-render the frame. */
export const NO_FOOTER: PageFooter = {}

/** The footer as of now: the declared record, or whatever its function builds. */
export function resolveFooter(
  footer: FooterInput | undefined,
  ctx: PageContext | null
): PageFooter {
  if (!footer) return NO_FOOTER
  if (typeof footer !== "function") return footer

  return ctx ? footer(ctx) : NO_FOOTER
}
