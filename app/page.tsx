"use client"

import { CommandPaletteDialog, Kbd } from "@/components/command-palette"

import { useActivity } from "./demo/activity"
import { rememberRootCommand, rootPage } from "./demo/commands"
import { ThemeCommandBridge } from "./demo/theme-bridge"

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

      {/* The palette knows nothing about this app: it is handed the page the
          stack starts on, and a bridge that publishes the theme toggle to
          commands, which are plain data and cannot call hooks themselves. */}
      <CommandPaletteDialog
        rootPage={rootPage}
        onCommand={(command) => rememberRootCommand(command.id)}
      >
        <ThemeCommandBridge />
      </CommandPaletteDialog>

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
