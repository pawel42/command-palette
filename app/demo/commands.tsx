"use client"

import { bind, Icon, ICONS } from "@/components/command-palette"
import type {
  Command,
  ListCommand,
  PageContext,
  PageFooter,
} from "@/components/command-palette"

import { NAV, NAV_LABELS } from "../nav"
import { clearActivity, logActivity } from "./activity"
import { deployPreview, exportData, purgeCdn, syncRemote } from "./api"
import { currentFilters, setFilters } from "./filters"
import { recentIds, rememberCommand } from "./recent"
import { branchPage } from "./pages/branch"
import { describeFilters, filtersPage, newIssuePage } from "./pages/forms"
import { createTaskPage } from "./pages/create-task"
import { level1Page } from "./pages/deep"
import { detailsPage } from "./pages/details"
import { invitePage } from "./pages/invite"
import { renamePage } from "./pages/rename"
import { projectsPage } from "./pages/projects"
import { releaseNotesPage } from "./pages/release-notes"
import { accountPage } from "./pages/signup"
import { EVERYWHERE } from "./paths"
import { ANYONE } from "./roles"
import { navigate } from "./router-bridge"
import { toggleTheme } from "./theme-bridge"

/**
 * The command registry — the root, and the only place commands live. Each one
 * either points at a page or runs an action.
 */
export const commands: Command[] = [
  {
    id: "branch",
    paths: EVERYWHERE,
    roles: ANYONE,
    title: "Branch Out",
    description: "three destinations",
    section: "Pages",
    icon: <Icon path={ICONS.branch} />,
    page: branchPage,
  },
  {
    id: "create-task",
    paths: EVERYWHERE,
    roles: ANYONE,
    title: "Create Task",
    description: "a form that keeps its draft",
    section: "Pages",
    // Not ⌘N: the browser opens a window on that before the page sees it.
    shortcut: ["Mod", "E"],
    keywords: ["new", "todo", "form"],
    icon: <Icon path={ICONS.plus} />,
    page: createTaskPage,
  },
  {
    id: "new-issue",
    paths: EVERYWHERE,
    roles: ANYONE,
    title: "New Issue",
    description: "shadcn Field + react-hook-form, ⌘↵ to submit",
    section: "Pages",
    shortcut: [["Mod", "G"], ["I"]],
    keywords: ["form", "validation", "select", "checkbox", "zod"],
    icon: <Icon path={ICONS.pencil} />,
    page: newIssuePage,
  },
  {
    // Opens a form and waits on it, the way "Go to a Project" waits on a
    // picker. The page resolves with its values or, on esc, with nothing —
    // which is the difference between applying filters and leaving them.
    id: "filters",
    paths: EVERYWHERE,
    roles: ANYONE,
    title: "Filter Issues",
    description: "checkboxes, radios and a select",
    section: "Pages",
    shortcut: [["Mod", "G"], ["F"]],
    keywords: ["filter", "status", "facet", "checkbox", "sort"],
    icon: <Icon path={ICONS.layers} />,
    run: async ({ nav }) => {
      const applied = await nav.push(filtersPage, currentFilters())
      if (!applied) return

      setFilters(applied)
      logActivity(describeFilters(applied))
    },
  },
  {
    id: "account",
    paths: EVERYWHERE,
    roles: ANYONE,
    title: "New Account",
    description: "two forms, one pushed from the other",
    section: "Pages",
    keywords: ["signup", "form", "profile", "wizard"],
    icon: <Icon path={ICONS.user} />,
    page: accountPage,
  },
  {
    id: "projects",
    paths: ["/*", "!/admin/*"],
    roles: ANYONE,
    title: "Browse Projects",
    description: "takes props, returns a value",
    section: "Pages",
    // ⌘G, let go, then P. One lead for a family of destinations, which is
    // what a sequence is for — see "Release Notes" for the other half of it.
    shortcut: [["Mod", "G"], ["P"]],
    keywords: ["client", "work", "picker"],
    icon: <Icon path={ICONS.folder} />,
    // Props are bound here, so the page can't be opened without them.
    page: bind(projectsPage, { archived: false }),
  },
  {
    id: "deep",
    paths: EVERYWHERE,
    roles: ANYONE,
    title: "Deep Dive",
    description: "three levels, one esc home",
    section: "Pages",
    keywords: ["stack", "escape"],
    icon: <Icon path={ICONS.layers} />,
    page: level1Page,
  },
  {
    id: "release-notes",
    paths: EVERYWHERE,
    roles: ANYONE,
    title: "Release Notes",
    description: "long, scrollable, keeps its place",
    section: "Pages",
    shortcut: [["Mod", "G"], ["R"]],
    keywords: ["changelog", "history", "scroll"],
    icon: <Icon path={ICONS.clock} />,
    page: releaseNotesPage,
  },
  {
    id: "details",
    paths: EVERYWHERE,
    roles: ANYONE,
    title: "How This Works",
    section: "Pages",
    keywords: ["help", "readme", "about"],
    icon: <Icon path={ICONS.book} />,
    page: detailsPage,
  },
  {
    id: "theme",
    paths: EVERYWHERE,
    roles: ANYONE,
    title: "Toggle Dark Mode",
    section: "Actions",
    shortcut: ["Mod", "D"],
    keywords: ["appearance", "light", "theme"],
    icon: <Icon path={ICONS.moon} />,
    run: () => {
      toggleTheme()
      logActivity("toggled the theme")
    },
  },
  {
    // The declared form: what to say while it runs, and what to say about
    // what came back. `runAsync` never rejects, so nothing here has to catch —
    // and `syncRemote` takes the signal, so starting something else or
    // navigating away really does call the request off.
    id: "sync",
    paths: ["/*", "!/admin/*"],
    roles: ["*", "!viewer"],
    title: "Sync with Remote",
    description: "slow, and says how it went",
    section: "Actions",
    keywords: ["pull", "fetch", "async"],
    icon: <Icon path={ICONS.branch} />,
    run: ({ runAsync }) =>
      runAsync(syncRemote, {
        loading: "Syncing with remote…",
        success: (files) => `Synced ${files} files`,
        error: "Couldn't reach the remote",
      }),
  },
  {
    // The whole of the zero-config form: an async handler, nothing declared.
    // The palette still says "Deploy a Preview…" while it runs — a run has to
    // say what it is, and with nothing declared the row's own title is the
    // answer — and the rejection becomes a toast carrying the error's own
    // message, instead of one nobody would have seen.
    //
    // What it gives up is the signal: leaving stops the palette waiting on
    // this, but the work itself has no way of being told. Take the signal —
    // `runAsync(deployPreview, { loading: "Deploying…" })` — to really abort.
    id: "deploy",
    paths: ["/*", "!/admin/*"],
    roles: ["*", "!viewer"],
    title: "Deploy a Preview",
    description: "fails, and says so",
    section: "Actions",
    keywords: ["ship", "build", "error", "async"],
    icon: <Icon path={ICONS.upload} />,
    run: () => deployPreview(),
  },
  {
    // No work behind it at all: the same footer line, said directly.
    id: "copy-link",
    paths: EVERYWHERE,
    roles: ANYONE,
    title: "Copy Palette Link",
    section: "Actions",
    keywords: ["share", "url", "toast"],
    icon: <Icon path={ICONS.check} />,
    run: ({ toast }) =>
      toast({ title: "Copied", message: "The link is on your clipboard" }),
  },
  {
    id: "log-query",
    // One exact path. Home is where the activity log is read, so the command
    // that writes to it lives there and is not offered anywhere it could not
    // be seen to have worked.
    paths: ["/"],
    roles: ANYONE,
    title: "Log What I Typed",
    description: "actions can read the query",
    section: "Actions",
    icon: <Icon path={ICONS.dot} />,
    run: ({ query }) => logActivity(`root query: “${query}”`),
  },

  /* ---- Where a command exists, the interesting cases -------------------- */

  {
    // The whole subtree, index included: `/admin/*` covers `/admin` itself as
    // well as everything under it, which is what makes `/*` mean every path by
    // the same reading rather than by a special case.
    id: "purge-cdn",
    paths: ["/admin/*"],
    roles: ["admin"],
    title: "Purge the CDN",
    description: "admin, and everything under it",
    section: "Admin",
    keywords: ["cache", "invalidate", "edge"],
    icon: <Icon path={ICONS.upload} />,
    run: ({ runAsync }) =>
      runAsync(purgeCdn, {
        loading: "Purging every edge…",
        success: (nodes) => `Purged ${nodes} edge nodes`,
      }),
  },
  {
    // A subtree with one page cut back out of it. Both rules cover
    // `/admin/users`; the later one decides, so this is the one admin command
    // that does not follow you in there.
    id: "rotate-keys",
    paths: ["/admin/*", "!/admin/users"],
    roles: ["admin"],
    title: "Rotate Signing Keys",
    description: "admin, but not the users page",
    section: "Admin",
    keywords: ["secret", "security", "jwt"],
    icon: <Icon path={ICONS.check} />,
    run: ({ toast }) =>
      toast({ title: "Rotated", message: "New keys are live in every region" }),
  },
  {
    id: "invite",
    paths: ["/admin/users"],
    roles: ["admin", "support"],
    title: "Invite a Teammate",
    description: "that one page",
    section: "Admin",
    shortcut: ["Mod", "Shift", "I"],
    keywords: ["seat", "member", "add"],
    icon: <Icon path={ICONS.user} />,
    page: invitePage,
  },
  {
    // The projects area: the index and every project under it.
    id: "new-project",
    paths: ["/projects/*"],
    roles: ["*", "!viewer"],
    title: "Start a Project",
    description: "the projects area",
    section: "Projects",
    keywords: ["create", "new"],
    icon: <Icon path={ICONS.plus} />,
    page: createTaskPage,
  },
  {
    // A dynamic route, named the way the router names it. `/projects/atlas`
    // is covered; `/projects` is not, because a dynamic segment still has to
    // be a segment.
    id: "rename-project",
    paths: ["/projects/[id]"],
    roles: ANYONE,
    title: "Rename This Project",
    description: "one project, not the index",
    section: "Projects",
    keywords: ["title", "edit"],
    icon: <Icon path={ICONS.pencil} />,
    page: renamePage,
  },
  {
    // One exact path, and a shortcut that goes with it: ⌘⇧E does nothing at
    // all anywhere else, because an unavailable command is not a greyed-out
    // row — it is a command that is not there to be matched.
    id: "export-data",
    paths: ["/settings"],
    roles: ["admin", "support"],
    title: "Export Your Data",
    description: "settings only, shortcut and all",
    section: "Settings",
    shortcut: ["Mod", "Shift", "E"],
    keywords: ["download", "archive", "gdpr"],
    icon: <Icon path={ICONS.upload} />,
    run: ({ runAsync }) =>
      runAsync(exportData, {
        loading: "Building your export…",
        success: "Export ready — check your email",
      }),
  },

  /* ---- Getting around, so the rules can be watched moving --------------- */

  ...NAV.filter((href) => href !== "/").map((href): Command => ({
    id: `go${href}`,
    // A way somewhere is available everywhere except where it already is.
    paths: ["/*", `!${href}`],
    roles: ANYONE,
    title: `Go to ${NAV_LABELS[href]}`,
    section: "Go to",
    keywords: ["navigate", "route", href],
    icon: <Icon path={ICONS.chevronRight} />,
    // The one kind of command that closes: the answer is the page behind the
    // palette, and it cannot be read through it. Everything else here stays
    // open, because the palette is where it says how it went.
    //
    // Closed and started over, in that order — the close is what the user
    // asked for and the reset happens behind the fade. Without it the palette
    // would keep its place the way it does on esc, and the place it kept
    // would be the query that named a command that does not exist on the page
    // it just went to: reopening on Settings to read "No results found".
    run: ({ closePalette, nav }) => {
      closePalette()
      nav.reset()
      navigate(href)
    },
  })),
  {
    id: "go-project",
    paths: ["/*", "!/projects/[id]"],
    roles: ANYONE,
    title: "Go to a Project",
    description: "picks one, then routes to it",
    section: "Go to",
    keywords: ["navigate", "open", "atlas"],
    icon: <Icon path={ICONS.folder} />,
    run: async ({ nav, closePalette }) => {
      const project = await nav.push(projectsPage, { archived: false })
      // Escaped out of the picker: nothing was chosen, so there is nowhere to
      // go and no reason to take the palette away.
      if (!project) return

      closePalette()
      nav.reset()
      // The route, not the URL — `/de/projekte/atlas` is this, in German.
      navigate({ pathname: "/projects/[id]", params: { id: project.id } })
    },
  },
]

/**
 * A recent row is the same command under a different heading, so it needs an
 * id of its own: the list keys its DOM ids and its selection off `item.id`,
 * and the original is still down in its own section.
 */
const RECENT_PREFIX = "recent:"

const byId = new Map(commands.map((command) => [command.id, command]))

/**
 * Files a command under a heading it doesn't belong to. Its `section` is left
 * alone — that is where it lives, and it is what the row goes on saying on its
 * right edge, so a row in "Recent" or "Results" still says whether it is a
 * page or an action.
 */
function regroup(
  command: Command,
  group: string,
  id = command.id
): ListCommand {
  return { ...command, id, group }
}

/** The commands last run, in that order, skipping any that have since gone. */
function recentRows(): ListCommand[] {
  return recentIds().flatMap((id) => {
    const command = byId.get(id)
    return command
      ? [regroup(command, "Recent", `${RECENT_PREFIX}${command.id}`)]
      : []
  })
}

/** Called with every command the palette runs — see `app/shell.tsx`. */
export function rememberRootCommand(id: string) {
  const rootId = id.startsWith(RECENT_PREFIX)
    ? id.slice(RECENT_PREFIX.length)
    : id
  // Only the registry's own commands: an action from a page deeper in, or from
  // the footer's panel, has no row up here to come back to.
  if (byId.has(rootId)) rememberCommand(rootId)
}

/**
 * What the root opens on. Idle, it is what you last used and then the registry
 * as written; typing throws the headings away, because the sections are how an
 * untouched list is read and a search is one ranked answer to what was typed.
 */
export function rootCommands({ query }: PageContext): ListCommand[] {
  return query.trim()
    ? commands.map((command) => regroup(command, "Results"))
    : [...recentRows(), ...commands]
}

/**
 * The root's footer. Declared rather than published from inside a page: there
 * is no page state behind it, so it is known up front and paints with the
 * first frame.
 */
export const rootFooter: PageFooter = {
  actions: [
    {
      id: "clear-activity",
      paths: EVERYWHERE,
      roles: ANYONE,
      title: "Clear the activity log",
      description: "the list under the palette",
      shortcut: ["Mod", "Shift", "L"],
      icon: <Icon path={ICONS.close} />,
      run: () => clearActivity(),
    },
    {
      id: "whats-new",
      paths: EVERYWHERE,
      roles: ANYONE,
      title: "What's new",
      description: "an action can open a page",
      icon: <Icon path={ICONS.clock} />,
      page: releaseNotesPage,
    },
    {
      // The footer answers to the path like everything else: open ⌘⇧K on
      // Home and this is not in it, on Admin it is, and its ⌘⇧B only fires
      // where the action itself exists.
      id: "impersonate",
      paths: ["/admin/*"],
      roles: ["admin"],
      title: "Impersonate a user",
      description: "admin only, panel and shortcut alike",
      shortcut: ["Mod", "Shift", "B"],
      icon: <Icon path={ICONS.user} />,
      run: ({ toast }) =>
        toast({ title: "Not in the demo", message: "But the row is real" }),
    },
  ],
}
