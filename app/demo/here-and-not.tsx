"use client"

import { isAvailableOn } from "@/components/command-palette"
import type { Command } from "@/components/command-palette"

import { commands, rootFooter } from "./commands"

/**
 * Not part of the palette — a window onto it. The same `isAvailableOn` the
 * palette runs on every row, run here over the whole registry, so what ⌘K
 * will and will not offer on this path can be read without opening it.
 */
export function HereAndNot({ path }: { path: string }) {
  const all: Command[] = [...commands, ...(rootFooter.actions ?? [])]
  const here = all.filter((command) => isAvailableOn(command.paths, path))
  const gone = all.filter((command) => !isAvailableOn(command.paths, path))

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-8">
      <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        What ⌘K offers on <code className="font-mono">{path}</code>
      </h2>

      <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
        <Column title={`Here (${here.length})`} commands={here} />
        <Column title={`Not here (${gone.length})`} commands={gone} muted />
      </div>
    </section>
  )
}

function Column({
  title,
  commands,
  muted,
}: {
  title: string
  commands: readonly Command[]
  muted?: boolean
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
              {command.paths.join(" ")}
            </code>
          </li>
        ))}
      </ul>
    </div>
  )
}
