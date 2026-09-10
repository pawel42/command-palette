"use client"

import type { ComponentType } from "react"

import { definePage } from "@/lib/palette"

import { ICONS, Icon, Kbd } from "../primitives"
import { useTaskDraft } from "./use-task-draft"

/**
 * A form page: `search: "disabled"` keeps the frame's input in place but
 * inert, and the draft is ordinary React state inside the component. Nothing
 * about it needs the engine — the page is hidden rather than unmounted, so the
 * draft survives navigating away and closing the palette. Behavior is in
 * `useTaskDraft`.
 */
export const createTaskPage = definePage<void, void, ComponentType>({
  id: "create-task",
  title: "Create Task",
  search: "disabled",
  placeholder: "Create Task — no search on this page",
  component: CreateTaskForm,
})

function CreateTaskForm() {
  const { draft, setTitle, setNotes, save } = useTaskDraft()

  return (
    <div className="space-y-4 p-4">
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Title</span>
        <input
          value={draft.title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ship the palette"
          autoFocus
          className="w-full rounded-md border border-border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Notes</span>
        <textarea
          value={draft.notes}
          onChange={(event) => setNotes(event.target.value)}
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
