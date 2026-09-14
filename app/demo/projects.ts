export type Project = {
  id: string
  name: string
  tasks: number
  archived?: boolean
}

/** Shared by the `/projects` routes and by the palette's project picker. */
export const ALL_PROJECTS: Project[] = [
  { id: "atlas", name: "Atlas Redesign", tasks: 12 },
  { id: "beacon", name: "Beacon API", tasks: 4 },
  { id: "comet", name: "Comet Migration", tasks: 27 },
  { id: "delta", name: "Delta Docs", tasks: 2 },
  { id: "echo", name: "Echo (2023)", tasks: 0, archived: true },
]

export const projectById = (id: string): Project | undefined =>
  ALL_PROJECTS.find((project) => project.id === id)
