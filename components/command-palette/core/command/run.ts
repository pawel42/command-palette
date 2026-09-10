import type { PageContext } from "../page/types"
import type { Command } from "./types"

/**
 * Turns a command into its effect: run the handler, or open the page it points
 * at. Disabled and display-only commands do neither. Returns whatever the
 * effect returns, so callers can await it.
 */
export function resolveCommand(
  command: Command,
  ctx: PageContext
): Promise<unknown> | void {
  if (command.disabled) return

  if (command.run) return command.run(ctx) ?? undefined

  if (command.page) return ctx.nav.open(command.page, command.options)
}

export function isPageCommand(
  command: Command
): command is Extract<Command, { page: unknown }> {
  return "page" in command && command.page !== undefined
}
