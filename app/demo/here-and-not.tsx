"use client"

import { isAvailableOn, isAvailableTo } from "@/components/command-palette"
import type { Command } from "@/components/command-palette"

import { commands, rootFooter } from "./commands"

/**
 * Not part of the palette — a window onto it. The same two functions the
 * palette runs on every row, run here over the whole registry, so what ⌘K will
 * and will not offer to this user on this path can be read without opening it.
 *
 * Both rules are asked separately rather than together, which is the point of
 * the third column: a row can be missing because of where you are, because of
 * who you are, or both, and a palette that simply did not draw it would leave
 * you guessing which. Inside the palette there is nothing to guess about —
 * unavailable is not there — so the explaining happens out here.
 *
 * It takes `roles` as a prop rather than calling `useCurrentRoles()`, because
 * it is mounted above `<CommandPalette>` and not inside it. The shell holds the
 * roles and hands the same value to both.
 */
export function HereAndNot({
  path,
  roles,
}: {
  path: string
  roles: readonly string[]
}) {
  const all: Command[] = [...commands, ...(rootFooter.actions ?? [])]
  const held = new Set(roles)

  const on = (command: Command) => isAvailableOn(command.paths, path)
  const to = (command: Command) => isAvailableTo(command.roles, held)

  const here = all.filter((command) => on(command) && to(command))
  // Not theirs is listed before not here: it is the rule that just moved.
  const notYours = all.filter((command) => !to(command))
  const notHere = all.filter((command) => to(command) && !on(command))

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-8">
      <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        What ⌘K offers on <code className="font-mono">{path}</code> to{" "}
        <code className="font-mono">
          {roles.length ? roles.join(", ") : "nobody"}
        </code>
      </h2>

      <div className="grid gap-x-8 gap-y-1 sm:grid-cols-3">
        <Column title={`Here (${here.length})`} commands={here} />
        <Column
          title={`Not here (${notHere.length})`}
          commands={notHere}
          muted
        />
        <Column
          title={`Not yours (${notYours.length})`}
          commands={notYours}
          muted
          rule="roles"
        />
      </div>
    </section>
  )
}

function Column({
  title,
  commands,
  muted,
  rule = "paths",
}: {
  title: string
  commands: readonly Command[]
  muted?: boolean
  /** Which of the two rules this column is about, and so which to print. */
  rule?: "paths" | "roles"
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium">{title}</p>
      <ul className="space-y-0.5 text-xs">
        {commands.map((command) => (
          <li
            key={command.id}
            className={
              muted
                ? "flex items-baseline justify-between gap-3 text-muted-foreground line-through decoration-muted-foreground/40"
                : "flex items-baseline justify-between gap-3"
            }
          >
            <span className="truncate">{command.title}</span>
            <code className="shrink-0 font-mono text-[11px] text-muted-foreground">
              {(rule === "roles" ? command.roles : command.paths).join(" ")}
            </code>
          </li>
        ))}
      </ul>
    </div>
  )
}
