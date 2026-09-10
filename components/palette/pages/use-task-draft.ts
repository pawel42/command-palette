"use client"

import type { PageDefinition } from "@/lib/palette"
import { useNavigation, usePageState } from "@/lib/palette/react"

import { logActivity } from "../activity"
import { projectsPage, type Project } from "./projects"

export type TaskDraft = {
  title: string
  notes: string
  project: Project | null
}

/**
 * The Create Task page's behavior: the draft in page state, an awaited push to
 * the project picker, and submitting. The `page` argument only carries types.
 */
export function useTaskDraft(
  page: PageDefinition<void, TaskDraft, void, unknown>
) {
  const [draft, setDraft] = usePageState(page)
  const nav = useNavigation()

  return {
    draft,

    setTitle: (title: string) => setDraft({ title }),
    setNotes: (notes: string) => setDraft({ notes }),

    pickProject: async () => {
      const project = await nav.push(projectsPage, { archived: false })
      // undefined when the picker was dismissed with esc.
      if (project) setDraft({ project })
    },

    save: () => {
      logActivity(
        `created “${draft.title || "untitled"}”${
          draft.project ? ` in ${draft.project.name}` : ""
        }`
      )
      nav.popToRoot()
    },
  }
}
