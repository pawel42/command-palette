"use client"

import type { ComponentType } from "react"

import { definePage } from "@/components/command-palette"
import type { PageDefinition, SearchMode } from "@/components/command-palette"

/**
 * A hand-written page kind, to show that pages are free-form: no list, no
 * items, no config — just a component with the frame's input switched off.
 *
 * It draws no chrome of its own, and could not if it wanted to. The title and
 * the way back are in the frame's header row on every page, whatever the
 * search mode, and "esc back" is already spelled out in the footer.
 */
export function notePage(
  id: string,
  title: string,
  body: React.ReactNode,
  /** "disabled" keeps the frame's input in place but greyed out. */
  search: SearchMode = "disabled"
): PageDefinition<void, void, ComponentType> {
  function Note() {
    return (
      <div className="space-y-2 p-4 text-sm leading-relaxed text-muted-foreground">
        {body}
      </div>
    )
  }
  Note.displayName = `NotePage(${id})`

  return definePage<void, void, ComponentType>({
    id,
    title,
    search,
    component: Note,
  })
}
