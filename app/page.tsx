"use client"

import { useActivity } from "@/components/palette/activity"
import { CommandPaletteDialog } from "@/components/palette/command-palette-dialog"
import { Kbd } from "@/components/palette/primitives"

export default function Page() {
  const activity = useActivity()

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        Press
        <span className="flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
        to open the command palette
      </p>

      <CommandPaletteDialog />

      <ul
        aria-live="polite"
        aria-label="Recent palette activity"
        className="space-y-1 text-center text-xs text-muted-foreground"
      >
        {activity.map((entry, index) => (
          <li
            key={`${entry}-${index}`}
            className={index > 0 ? "opacity-50" : undefined}
          >
            {entry}
          </li>
        ))}
      </ul>
    </main>
  )
}
