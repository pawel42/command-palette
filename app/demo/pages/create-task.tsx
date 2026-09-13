"use client"

import { Icon, ICONS, usePageFooter } from "@/components/command-palette"
import type { Page } from "@/components/command-palette"

import { useTaskDraft } from "./use-task-draft"

/**
 * A form page: `search: "disabled"` keeps the frame's input in place but
 * inert, and the draft is ordinary React state inside the component. Nothing
 * about it needs the engine — the page is hidden rather than unmounted, so the
 * draft survives navigating away and closing the palette. Behavior is in
 * `useTaskDraft`.
 */
export const createTaskPage: Page = {
  id: "create-task",
  title: "Create Task",
  search: "disabled",
  placeholder: "Create Task — no search on this page",
  render: () => <CreateTaskForm />,
}

function CreateTaskForm() {
  const { draft, setTitle, setNotes, save } = useTaskDraft()

  // Save reads the draft, so the footer is published from in here. ⌘↵ works
  // with the caret in either field — a chord with ⌘ in it is the only kind
  // allowed to fire while the user is typing.
  usePageFooter({
    actions: [
      {
        id: "save",
        title: "Save and go home",
        shortcut: ["Mod", "Enter"],
        icon: <Icon path={ICONS.check} />,
        run: save,
      },
    ],
    hints: [{ keys: ["Escape"], label: "discards this draft" }],
  })

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

      <button
        type="button"
        onClick={save}
        className="flex items-center gap-2 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover focus-visible:outline-none"
      >
        <Icon path={ICONS.check} className="size-3.5" />
        Save and go home
      </button>
    </div>
  )
}
