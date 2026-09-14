"use client"

import type { Page, SearchMode } from "@/components/command-palette"

/**
 * A hand-written page kind, to show that pages are free-form: no list, no
 * items, no config — just a body with the frame's input switched off.
 *
 * It draws no chrome of its own, and could not if it wanted to. The title and
 * the way back are in the frame's header row on every page, whatever the
 * search mode, and "esc back" is already spelled out in the footer.
 */
export function notePage(
  id: string,
  title: string,
  body: React.ReactNode,
  /** "disabled" drops the frame's input; the row carries the title instead. */
  search: SearchMode = "disabled"
): Page {
  function Note() {
    return (
      <div className="space-y-2 p-4 text-sm leading-relaxed text-muted-foreground">
        {body}
      </div>
    )
  }
  Note.displayName = `NotePage(${id})`

  // `render` is mounted as a component, so this is a real component with a
  // name — not a call made during someone else's render.
  return { id, title, search, render: Note }
}
