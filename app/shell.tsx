"use client"

import { useState } from "react"
import { useLocale } from "next-intl"
import { useParams } from "next/navigation"

import {
  CommandPalette,
  Kbd,
  TOGGLE_SHORTCUT,
} from "@/components/command-palette"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { cn } from "@/lib/utils"

import { useActivity } from "./demo/activity"
import { rememberRootCommand, rootCommands, rootFooter } from "./demo/commands"
import { recentIds, subscribeRecent } from "./demo/recent"
import { RouterCommandBridge } from "./demo/router-bridge"
import { ThemeCommandBridge } from "./demo/theme-bridge"
import { HereAndNot } from "./demo/here-and-not"
import { DEFAULT_ROLE } from "./demo/roles"
import type { AppRole } from "./demo/roles"
import { NAV, NAV_LABELS } from "./nav"

/**
 * Everything that outlives a route change: the nav, the palette, and the log
 * of what the palette just did.
 *
 * The palette lives here rather than on a page because that is what the
 * feature is about — one registry, mounted once, whose rows answer to wherever
 * the user has got to. It is handed the routing config and works the rest out:
 * the path a command's `paths` is read against is the one the router already
 * knows, and nothing here has to fetch it and pass it on.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  // The internal pathname — `/projects/[id]`, not `/de/projekte/atlas`. The
  // nav needs it to say which link is the current one; the palette gets at the
  // same thing itself, off `routing`.
  const pathname = usePathname()
  const activity = useActivity()
  // Who the palette is being shown to. State in the shell, not in the palette:
  // a real app reads this off its session, and the palette's only interest is
  // being told. See `SIGNED_OUT` for the empty case.
  const [roles, setRoles] = useState<readonly AppRole[]>([DEFAULT_ROLE])

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
              {NAV_LABELS[href]}
            </Link>
          ))}

          <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <RoleSwitch roles={roles} onChange={setRoles} />
            <LocaleSwitch />
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

      <HereAndNot path={pathname} roles={roles} />

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
          it opens on, the routing config their `paths` are judged against, and
          two bridges that publish the theme toggle and the router to them —
          commands are plain data and cannot call hooks themselves. */}
      <CommandPalette
        commands={rootCommands}
        routing={routing}
        roles={roles}
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

/** Signed out: holding nothing, and the reason `"*"` is spelled out. */
const SIGNED_OUT: readonly AppRole[] = []

/**
 * Who is looking — the control the roles feature exists to be watched through.
 *
 * `LocaleSwitch` below is the precedent: a switch in the chrome whose only job
 * is to prove a rule holds. Flip this with the palette open and the list, the
 * ⌘⇧K panel and the live shortcuts all rebuild under you, because the rules
 * are applied where the rows are rather than once at mount.
 *
 * The pair at the end is the one that earns its place. A user holding admin
 * *and* viewer is what makes `["*", "!viewer"]` a question worth asking, and
 * the answer — hidden, because a deny wins wherever it sits — is the whole of
 * why the reading is not `paths`'.
 */
const CHOICES: { label: string; roles: readonly AppRole[] }[] = [
  { label: "out", roles: SIGNED_OUT },
  { label: "viewer", roles: ["viewer"] },
  { label: "member", roles: ["member"] },
  { label: "support", roles: ["support"] },
  { label: "admin", roles: ["admin"] },
  { label: "admin+viewer", roles: ["admin", "viewer"] },
]

function RoleSwitch({
  roles,
  onChange,
}: {
  roles: readonly AppRole[]
  onChange: (roles: readonly AppRole[]) => void
}) {
  const current = roles.join(",")

  return (
    <span className="flex items-center gap-1">
      {CHOICES.map((choice) => (
        <button
          key={choice.label}
          type="button"
          onClick={() => onChange(choice.roles)}
          className={cn(
            "rounded px-1 py-0.5 font-mono",
            choice.roles.join(",") === current
              ? "bg-muted text-foreground"
              : "hover:text-foreground"
          )}
        >
          {choice.label}
        </button>
      ))}
    </span>
  )
}

/**
 * The same page, in the other locale — the whole point of the routing config
 * being the single list. It swaps the URL (`/settings` ⇄ `/de/einstellungen`)
 * and changes nothing the palette reads: `usePathname()` says `/settings`
 * either way, so every `paths` rule holds without being written twice.
 */
function LocaleSwitch() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const locale = useLocale()

  return (
    <span className="flex items-center gap-1">
      {routing.locales.map((next) => (
        <button
          key={next}
          type="button"
          onClick={() =>
            router.replace(
              // @ts-expect-error -- `params` is typed per route, and this one
              // stands for all of them; they are the route's own params either
              // way, carried across unchanged.
              { pathname, params },
              { locale: next }
            )
          }
          className={cn(
            "rounded px-1 py-0.5 font-mono uppercase",
            next === locale
              ? "bg-muted text-foreground"
              : "hover:text-foreground"
          )}
        >
          {next}
        </button>
      ))}
    </span>
  )
}
