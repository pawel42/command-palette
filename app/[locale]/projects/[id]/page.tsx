import { notFound } from "next/navigation"

import { projectById } from "../../../demo/projects"
import { RouteIntro, Rule } from "../../../demo/prose"

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = projectById(id)
  if (!project) notFound()

  return (
    <>
      <RouteIntro title={project.name}>
        <p>
          A dynamic route. A rule names it the way the router does —{" "}
          <Rule>&quot;/projects/[id]&quot;</Rule> — and that is what the palette
          is matching, because the pathname it reads is the route and not the
          URL. Look at the corner:{" "}
          <code className="font-mono">/projects/atlas</code> in the address bar,{" "}
          <Rule>/projects/[id]</Rule> up there. So this page is covered and{" "}
          <code className="font-mono">/projects</code> is not.
        </p>
        <p>
          &ldquo;Rename This Project&rdquo; exists only here. Go back up a level
          with it in the palette open and watch it go.
        </p>
      </RouteIntro>

      <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
        <dt className="text-muted-foreground">Slug</dt>
        <dd className="font-mono">{project.id}</dd>
        <dt className="text-muted-foreground">Open tasks</dt>
        <dd>{project.tasks}</dd>
        <dt className="text-muted-foreground">Status</dt>
        <dd>{project.archived ? "Archived" : "Active"}</dd>
      </dl>
    </>
  )
}
