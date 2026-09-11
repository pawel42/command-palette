"use client"

import { Icon, ICONS } from "@/components/command-palette"
import type {
  Command,
  PageContext,
  PageFooter,
} from "@/components/command-palette"

import { clearActivity, logActivity } from "./activity"
import { deployPreview, syncRemote } from "./api"
import { recentIds, rememberCommand } from "./recent"
import { branchPage } from "./pages/branch"
import { createTaskPage } from "./pages/create-task"
import { level1Page } from "./pages/deep"
import { detailsPage } from "./pages/details"
import { projectsPage } from "./pages/projects"
import { releaseNotesPage } from "./pages/release-notes"
import { accountPage } from "./pages/signup"
import { toggleTheme } from "./theme-bridge"

/**
 * The command registry — the root, and the only place commands live. Each one
 * either points at a page or runs an action.
 */
export const commands: Command[] = [
  {
    id: "branch",
    title: "Branch Out",
    subtitle: "three destinations",
    section: "Pages",
    icon: <Icon path={ICONS.branch} />,
    page: branchPage,
  },
  {
    id: "create-task",
    title: "Create Task",
    subtitle: "a form that keeps its draft",
    section: "Pages",
    shortcut: ["⌘", "N"],
    keywords: ["new", "todo", "form"],
    icon: <Icon path={ICONS.plus} />,
    page: createTaskPage,
  },
  {
    id: "account",
    title: "New Account",
    subtitle: "two forms, one pushed from the other",
    section: "Pages",
    keywords: ["signup", "form", "profile", "wizard"],
    icon: <Icon path={ICONS.user} />,
    page: accountPage,
  },
  {
    id: "projects",
    title: "Browse Projects",
    subtitle: "takes props, returns a value",
    section: "Pages",
    keywords: ["client", "work", "picker"],
    icon: <Icon path={ICONS.folder} />,
    // Props are bound here, so the page can't be opened without them.
    page: projectsPage.with({ archived: false }),
  },
  {
    id: "deep",
    title: "Deep Dive",
    subtitle: "three levels, one esc home",
    section: "Pages",
    keywords: ["stack", "escape"],
    icon: <Icon path={ICONS.layers} />,
    page: level1Page,
  },
  {
    id: "release-notes",
    title: "Release Notes",
    subtitle: "long, scrollable, keeps its place",
    section: "Pages",
    keywords: ["changelog", "history", "scroll"],
    icon: <Icon path={ICONS.clock} />,
    page: releaseNotesPage,
  },
  {
    id: "details",
    title: "How This Works",
    section: "Pages",
    keywords: ["help", "readme", "about"],
    icon: <Icon path={ICONS.book} />,
    page: detailsPage,
  },
  {
    id: "theme",
    title: "Toggle Dark Mode",
    section: "Actions",
    shortcut: ["⌘", "D"],
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
    title: "Sync with Remote",
    subtitle: "slow, and says how it went",
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
    title: "Deploy a Preview",
    subtitle: "fails, and says so",
    section: "Actions",
    keywords: ["ship", "build", "error", "async"],
    icon: <Icon path={ICONS.upload} />,
    run: () => deployPreview(),
    // The failure, after the user has been shown it. Nothing happens to a
    // caught error unless the command says so — this one writes it to the log
    // under the palette; yours might be `console.error` or a reporter.
    onError: (error) =>
      logActivity(
        `deploy failed: ${error instanceof Error ? error.message : error}`
      ),
  },
  {
    // No work behind it at all: the same footer line, said directly.
    id: "copy-link",
    title: "Copy Palette Link",
    section: "Actions",
    keywords: ["share", "url", "toast"],
    icon: <Icon path={ICONS.check} />,
    run: ({ toast }) =>
      toast({ title: "Copied", message: "The link is on your clipboard" }),
  },
  {
    id: "log-query",
    title: "Log What I Typed",
    subtitle: "actions can read the query",
    section: "Actions",
    icon: <Icon path={ICONS.dot} />,
    run: ({ query }) => logActivity(`root query: “${query}”`),
  },
  {
    id: "blocked",
    title: "Push to Remote",
    subtitle: "nothing to push",
    section: "Actions",
    disabled: true,
    icon: <Icon path={ICONS.upload} />,
    run: () => logActivity("this should never run"),
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
 * Regroups a command under a heading it doesn't belong to, keeping its real
 * section as the label on the row — so a row in "Recent" or "Results" still
 * says whether it is a page or an action.
 */
function regroup(command: Command, section: string, id = command.id): Command {
  return { ...command, id, section, label: command.section }
}

/** The commands last run, in that order, skipping any that have since gone. */
function recentRows(): Command[] {
  return recentIds().flatMap((id) => {
    const command = byId.get(id)
    return command
      ? [regroup(command, "Recent", `${RECENT_PREFIX}${command.id}`)]
      : []
  })
}

/** Called with every command the palette runs — see `app/page.tsx`. */
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
export function rootCommands({ query }: PageContext): Command[] {
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
      title: "Clear the activity log",
      subtitle: "the list under the palette",
      shortcut: ["⌘", "⇧", "L"],
      icon: <Icon path={ICONS.close} />,
      run: () => clearActivity(),
    },
    {
      id: "whats-new",
      title: "What's new",
      subtitle: "an action can open a page",
      icon: <Icon path={ICONS.clock} />,
      page: releaseNotesPage,
    },
  ],
}
