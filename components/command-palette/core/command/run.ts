import type { PageContext } from "../page/types"
import type { Command } from "./types"


export function resolveCommand(command: Command, ctx: PageContext): unknown {
  if (command.run) return command.run(ctx) ?? undefined
  return ctx.nav.open(command.page, command.options)
}

export function isPageCommand(
  command: Command
): command is Extract<Command, { page: unknown }> {
  return "page" in command && command.page !== undefined
}
