"use client"

import { logActivity } from "../activity"
import { bind, Icon, ICONS, ListPage } from "@/components/command-palette"
import type { Page, PageFooter } from "@/components/command-palette"

import { ALL_PROJECTS } from "../projects"
import type { Project } from "../projects"

import { EVERYWHERE } from "../paths"
import { ANYONE } from "../roles"

export type { Project }

/**
 * A list that takes props and returns a value: `archived` decides what it
 * lists, and `resolve(project)` settles the promise from whichever `push`
 * opened it — then closes the page. The context arrives as `render`'s props,
 * so the list's rows are built from it directly.
 */
export const projectsPage: Page<{ archived: boolean }, Project> = {
  id: "projects",
  title: "Projects",
  placeholder: "Search projects…",

  // The declarative half of the footer, and the reason it takes a function:
  // this one is built from the page's own props, and it has to be built late
  // — a plain object here would name the page before the page exists.
  footer: ({ props }): PageFooter => ({
    actions: props.archived
      ? []
      : [
          {
            id: "archived",
            paths: EVERYWHERE,
            roles: ANYONE,
            title: "Browse archived projects",
            description: "the same page, other props",
            section: "View",
            icon: <Icon path={ICONS.clock} />,
            page: bind(projectsPage, { archived: true }),
          },
        ],
  }),

  render: ({ props, resolve }) => (
    <ListPage
      emptyMessage="No project matches that."
      items={ALL_PROJECTS.filter(
        (project) => props.archived || !project.archived
      ).map((project) => ({
        id: project.id,
        paths: EVERYWHERE,
        roles: ANYONE,
        title: project.name,
        subtitle: `${project.tasks} open`,
        section: "Projects",
        keywords: [project.id],
        icon: <Icon path={ICONS.folder} />,
        run: () => {
          logActivity(`picked project “${project.name}”`)
          resolve(project)
        },
      }))}
    />
  ),
}
