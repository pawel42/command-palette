import Link from "next/link"

import { ALL_PROJECTS } from "../demo/projects"
import { RouteIntro, Rule } from "../demo/prose"

export default function ProjectsIndex() {
  return (
    <>
      <RouteIntro title="Projects">
        <p>
          The projects area. <Rule>[&quot;/projects/*&quot;]</Rule> covers this
          page and every project under it, so anything filed that way is here
          and stays here when you open one.
        </p>
        <p>
          Open a project to see the two rules that only hold one level down.
        </p>
      </RouteIntro>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {ALL_PROJECTS.filter((project) => !project.archived).map((project) => (
          <li key={project.id}>
            <Link
              href={`/projects/${project.id}`}
              className="flex items-baseline justify-between px-4 py-3 text-sm hover:bg-accent"
            >
              <span className="font-medium">{project.name}</span>
              <span className="text-xs text-muted-foreground">
                {project.tasks} open
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
