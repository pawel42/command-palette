import type { PageContext } from "../page/types"
import type { Command } from "./types"

/**
 * Turns a command into its effect: run the handler, or open the page it points
 * at. Returns whatever the effect returned, so a caller can await it — and so
 * the store can tell a promise from anything else.
 */
export function resolveCommand(command: Command, ctx: PageContext): unknown {
  if (command.run) return command.run(ctx) ?? undefined

  if (command.page) return ctx.nav.open(command.page, command.options)
}

export function isPageCommand(
  command: Command
): command is Extract<Command, { page: unknown }> {
  return "page" in command && command.page !== undefined
}
