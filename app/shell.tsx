"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  CommandPalette,
  Kbd,
  TOGGLE_SHORTCUT,
} from "@/components/command-palette"

import { useActivity } from "./demo/activity"
import { rememberRootCommand, rootCommands, rootFooter } from "./demo/commands"
import { recentIds, subscribeRecent } from "./demo/recent"
import { RouterCommandBridge } from "./demo/router-bridge"
import { ThemeCommandBridge } from "./demo/theme-bridge"
import { HereAndNot } from "./demo/here-and-not"
import { NAV, ROUTES } from "./routes"
import { cn } from "@/lib/utils"

/**
 * Everything that outlives a route change: the nav, the palette, and the log
 * of what the palette just did.
 *
 * The palette lives here rather than on a page because that is what the
 * feature is about — one registry, mounted once, whose rows answer to wherever
 * the user has got to. `usePathname()` is the whole of what it is told; every
 * command's `paths` is read against it.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const activity = useActivity()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <nav className="mx-auto flex max-w-3xl flex-wrap items-center gap-1 px-4 py-3">
          {NAV.map((href) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm transition-colors",
                pathname === href
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {ROUTES[href]}
            </Link>
          ))}

          <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
              {pathname}
            </code>
            <span className="flex items-center gap-1">
              {TOGGLE_SHORTCUT.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </span>
          </span>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-10">{children}</main>

      <HereAndNot path={pathname} />

      <footer className="mx-auto w-full max-w-3xl px-4 pt-2 pb-10">
        <ul
          aria-live="polite"
          aria-label="Recent palette activity"
          className="space-y-1 text-xs text-muted-foreground"
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
      </footer>

      {/* The palette knows nothing about this app: it is handed the commands
          it opens on, the path they are judged against, and two bridges that
          publish the theme toggle and the router to them — commands are plain
          data and cannot call hooks themselves. */}
      <CommandPalette
        commands={rootCommands}
        path={pathname}
        placeholder="Search for a page or an action…"
        footer={rootFooter}
        // The recents live outside React, so say what else the root watches:
        // without this a write out there waits for the next keystroke.
        watch={{ subscribe: subscribeRecent, getSnapshot: recentIds }}
        onCommand={(command) => rememberRootCommand(command.id)}
      >
        <ThemeCommandBridge />
        <RouterCommandBridge />
      </CommandPalette>
    </div>
  )
}
