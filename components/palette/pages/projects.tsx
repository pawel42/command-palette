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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * A list page that loads asynchronously, takes props, and returns a value:
 * `resolve(project)` settles the promise from whichever `push` opened it.
 */
export const projectsPage = listPage<
  { archived: boolean },
  { projects: Project[]; loading: boolean },
  Project
>({
  id: "projects",
  title: "Projects",
  placeholder: "Search projects…",
  emptyMessage: "No project matches that.",
  initialState: () => ({ projects: [], loading: true }),

  load: async ({ props, setState }) => {
    await sleep(500)
    setState({
      projects: ALL_PROJECTS.filter(
        (project) => props.archived || !project.archived
      ),
      loading: false,
    })
  },

  items: ({ state, resolve }) =>
    state.loading
      ? [{ id: "loading", title: "Loading projects…", disabled: true }]
      : state.projects.map((project) => ({
          id: project.id,
          title: project.name,
          subtitle: `${project.tasks} open`,
          section: "Projects",
          keywords: [project.id],
          icon: <Icon path={ICONS.folder} />,
          run: () => {
            logActivity(`picked project “${project.name}”`)
            // Settles `await nav.push(projectsPage, …)` and closes this page.
            resolve(project)
          },
        })),
})
