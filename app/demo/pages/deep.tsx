"use client"

import { logActivity } from "../activity"
import { bind, Icon, ICONS } from "@/components/command-palette"
import type { Page } from "@/components/command-palette"
import { projectsPage } from "./projects"

/**
 * Three levels deep, where the last one sets `escape: "root"` on the page
 * itself — one press unwinds all three and drops their state.
 */
export const level3Page: Page = {
  id: "level-3",
  title: "Level 3",
  placeholder: "Bottom of the chain…",
  escape: "root",
  note: () => (
    <p className="px-2 py-2 text-xs text-muted-foreground">
      This page declares <code>escape: &quot;root&quot;</code> — one esc goes
      all the way home instead of walking back up.
    </p>
  ),
  items: [
    {
      id: "home",
      title: "Go home the explicit way",
      section: "Navigate",
      icon: <Icon path={ICONS.chevronLeft} />,
      run: ({ nav }) => {
        logActivity("popToRoot() from level 3")
        nav.popToRoot()
      },
    },
  ],
}

export const level2Page: Page = {
  id: "level-2",
  title: "Level 2",
  placeholder: "Keep going…",
  items: [
    {
      id: "next",
      title: "Level 3",
      subtitle: "esc route: root",
      section: "Navigate",
      icon: <Icon path={ICONS.layers} />,
      page: level3Page,
    },
  ],
}

export const level1Page: Page = {
  id: "level-1",
  title: "Level 1",
  placeholder: "Go deeper…",
  items: [
    {
      id: "next",
      title: "Level 2",
      section: "Navigate",
      icon: <Icon path={ICONS.layers} />,
      page: level2Page,
    },
    {
      id: "projects-again",
      title: "…or jump to Projects from here",
      subtitle: "same page, different parent",
      section: "Navigate",
      icon: <Icon path={ICONS.folder} />,
      page: bind(projectsPage, { archived: true }),
    },
  ],
}
