"use client"

import { useState } from "react"

import { useNavigation } from "@/lib/palette/react"

import { logActivity } from "../activity"

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
 */
export function useTaskDraft() {
  const [draft, setDraft] = useState<TaskDraft>({ title: "", notes: "" })
  const nav = useNavigation()

  return {
    draft,

    setTitle: (title: string) =>
      setDraft((previous) => ({ ...previous, title })),
    setNotes: (notes: string) =>
      setDraft((previous) => ({ ...previous, notes })),

    save: () => {
      logActivity(`created “${draft.title || "untitled"}”`)
      nav.popToRoot()
    },
  }
}
