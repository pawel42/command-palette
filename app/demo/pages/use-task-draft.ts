"use client"

import { useState } from "react"

import { useNavigation, useRunAsync } from "@/components/command-palette"

import { logActivity } from "../activity"
import { saveTask } from "../api"

export type TaskDraft = {
  title: string
  notes: string
}

/**
 * The Create Task page's behavior: the draft, and submitting it.
 *
 * The draft is plain React state. It survives pushing a page over this one and
 * closing the palette entirely, because pages are hidden rather than unmounted
 * — the engine holds nothing on the page's behalf.
 *
 * Submitting is the other half: a hand-written page's own async work, put
 * through the same `runAsync` a command uses, so it gets the same progress bar
 * and the same toast. The page draws no spinner of its own and keeps no
 * `saving` flag — there is nothing here the frame isn't already showing.
 */
export function useTaskDraft() {
  const [draft, setDraft] = useState<TaskDraft>({ title: "", notes: "" })
  const nav = useNavigation()
  const runAsync = useRunAsync()

  return {
    draft,

    setTitle: (title: string) =>
      setDraft((previous) => ({ ...previous, title })),
    setNotes: (notes: string) =>
      setDraft((previous) => ({ ...previous, notes })),

    save: async () => {
      const saved = await runAsync((signal) => saveTask(draft.title, signal), {
        loading: "Saving the task…",
        success: (title) => `Created “${title}”`,
      })

      // undefined means it did not happen: it failed and the toast has already
      // said so, or the user navigated away and it was called off. Either way
      // the form stays where it is, with the draft still in it.
      if (saved === undefined) return

      logActivity(`created “${saved}”`)
      nav.popToRoot()
    },
  }
}
