"use client"

import type { Command } from "@/lib/palette"

import { logActivity } from "./activity"
import { listPage } from "./list-page"
import { ICONS, Icon } from "./primitives"
import { branchPage } from "./pages/branch"
import { createTaskPage } from "./pages/create-task"
import { level1Page } from "./pages/deep"
import { detailsPage } from "./pages/details"
import { projectsPage } from "./pages/projects"
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
    id: "projects",
    title: "Browse Projects",
    subtitle: "loads async, returns a value",
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

/** The root is a list page over the registry — not a special case. */
export const rootPage = listPage({
  id: "root",
  title: "Root",
  placeholder: "Search for a page or an action…",
  items: commands,
})
