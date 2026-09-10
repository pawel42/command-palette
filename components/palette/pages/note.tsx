"use client"

import type { ComponentType } from "react"

import { definePage } from "@/lib/palette"
import type { PageDefinition, SearchMode } from "@/lib/palette"
import { useNavigation } from "@/lib/palette/react"

import { ICONS, Icon, Kbd } from "../primitives"

/**
 * A hand-written page kind, to show that pages are free-form: no list, no
 * items, no config — just a component with the frame's input switched off.
 */
export function notePage(
  id: string,
  title: string,
  body: React.ReactNode,
  /** "disabled" keeps the frame's input in place but greyed out. */
  search: SearchMode = "disabled"
): PageDefinition<void, void, ComponentType> {
  function Note() {
    const nav = useNavigation()

    return (
      <div className="space-y-3 p-4 text-sm">
        <h2 className="flex items-center gap-2 font-medium">
          <Icon path={ICONS.dot} className="size-4 text-muted-foreground" />
          {title}
        </h2>

        <div className="space-y-2 leading-relaxed text-muted-foreground">
          {body}
        </div>

        <button
          type="button"
          onClick={() => nav.pop()}
          className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Kbd>esc</Kbd> go back
        </button>
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
