"use client"

import type { ComponentType } from "react"

import { definePage } from "@/lib/palette"
import { useNavigation, usePageState } from "@/lib/palette/react"

import { logActivity } from "../activity"
import { ICONS, Icon, Kbd } from "../primitives"
import { projectsPage, type Project } from "./projects"

type TaskDraft = {
  title: string
  notes: string
  project: Project | null
}

/**
 * A form page: `search: "disabled"` keeps the frame's input in place but inert,
 * page state holds the draft, and picking a project is an awaited push to
 * another page. Leaving and coming back keeps the draft, because the state
 * lives in the store, not in this component.
 */
export const createTaskPage = definePage<void, TaskDraft, void, ComponentType>({
  id: "create-task",
  title: "Create Task",
  search: "disabled",
  placeholder: "Create Task — no search on this page",
  initialState: () => ({ title: "", notes: "", project: null }),
  component: CreateTaskForm,
})

function CreateTaskForm() {
  const [draft, setDraft] = usePageState(createTaskPage)
  const nav = useNavigation()

  const pickProject = async () => {
    const project = await nav.push(projectsPage, { archived: false })
    // undefined when the picker was dismissed with esc.
    if (project) setDraft({ project })
  }

  const save = () => {
    logActivity(
      `created “${draft.title || "untitled"}”${
        draft.project ? ` in ${draft.project.name}` : ""
      }`
    )
    nav.popToRoot()
  }

  return (
    <div className="space-y-4 p-4">
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Title</span>
        <input
          value={draft.title}
          onChange={(event) => setDraft({ title: event.target.value })}
          placeholder="Ship the palette"
          autoFocus
          className="w-full rounded-md border border-border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring"
        />
      </label>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Project
        </span>
        <button
          type="button"
          onClick={pickProject}
          className="flex w-full items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Icon path={ICONS.folder} className="size-4 text-muted-foreground" />
          <span className={draft.project ? undefined : "text-muted-foreground"}>
            {draft.project?.name ?? "Pick a project…"}
          </span>
          <Icon
            path={ICONS.chevronRight}
            className="ml-auto size-3.5 text-muted-foreground"
          />
        </button>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Notes</span>
        <textarea
          value={draft.notes}
          onChange={(event) => setDraft({ notes: event.target.value })}
          rows={2}
          placeholder="Anything worth remembering"
          className="w-full resize-none rounded-md border border-border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring"
        />
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          className="flex items-center gap-2 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Icon path={ICONS.check} className="size-3.5" />
          Save and go home
        </button>
        <p className="text-xs text-muted-foreground">
          <Kbd>esc</Kbd> discards this draft
        </p>
      </div>
    </div>
  )
}
