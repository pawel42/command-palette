"use client"

import { logActivity } from "../activity"
import { listPage } from "../list-page"
import { ICONS, Icon } from "../primitives"

export type Project = {
  id: string
  name: string
  tasks: number
  archived?: boolean
}

const ALL_PROJECTS: Project[] = [
  { id: "atlas", name: "Atlas Redesign", tasks: 12 },
  { id: "beacon", name: "Beacon API", tasks: 4 },
  { id: "comet", name: "Comet Migration", tasks: 27 },
  { id: "delta", name: "Delta Docs", tasks: 2 },
  { id: "echo", name: "Echo (2023)", tasks: 0, archived: true },
]

/**
 * A list page that takes props and returns a value: `archived` decides what it
 * lists, and `resolve(project)` settles the promise from whichever `push`
 * opened it — then closes the page.
 */
export const projectsPage = listPage<{ archived: boolean }, Project>({
  id: "projects",
  title: "Projects",
  placeholder: "Search projects…",
  emptyMessage: "No project matches that.",

  items: ({ props, resolve }) =>
    ALL_PROJECTS.filter((project) => props.archived || !project.archived).map(
      (project) => ({
        id: project.id,
        title: project.name,
        subtitle: `${project.tasks} open`,
        section: "Projects",
        keywords: [project.id],
        icon: <Icon path={ICONS.folder} />,
        run: () => {
          logActivity(`picked project “${project.name}”`)
          resolve(project)
        },
      })
    ),
})
