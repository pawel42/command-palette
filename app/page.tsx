"use client"

import { useActivity } from "@/components/palette/activity"
import { CommandPalette } from "@/components/palette/command-palette"

export default function Page() {
  const activity = useActivity()

  return (
    <main className="flex min-h-svh items-start justify-center px-4 pt-24">
      <div className="w-full max-w-xl">
        <CommandPalette />

        <ul
          aria-live="polite"
          aria-label="Recent palette activity"
          className="mt-3 space-y-1 text-center text-xs text-muted-foreground"
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
      </div>
    </main>
  )
}
