"use client"

import { useState } from "react"

import type { Command } from "../../core"
import { useListController, usePaletteStore } from "../../react"
import { CommandRows } from "../internal/rows"
import type { ListSection } from "../internal/rows"
import { SearchIcon } from "../primitives"

export type ActionPanelProps = {
  id: string
  panelRef: React.RefObject<HTMLDivElement | null>
  /** What to draw. Handlers are taken from `getActions` at the last moment. */
  actions: readonly Command[]
  /** The same actions, live: rebuilt from the page's footer and re-checked
   *  against the current path — see `useFrame`. */
  getActions: () => readonly Command[]
  close: () => void
}

/**
 * The footer's action panel: the page's commands, filtered, one keypress from
 * anywhere in the palette.
 *
 * It stays a descendant of the frame root rather than being portalled, and
 * that is load-bearing rather than incidental: the frame's window-level esc
 * listener only stands down while focus is *inside* the root, so a portalled
 * panel would make every esc pressed in it unwind a page behind the user.
 *
 * Mounted only while open, which is also how its query and its selection are
 * reset — there is no state here to clear.
 */
export function ActionPanel({
  id,
  panelRef,
  actions,
  getActions,
  close,
}: ActionPanelProps) {
  const store = usePaletteStore()
  const [query, setQuery] = useState("")
  const [activeItemId, setActiveItemId] = useState<string | null>(null)

  const list = useListController(actions, {
    query,
    activeItemId,
    setActiveItemId,
    onSelect: (item) => {
      // Closed before it runs, never after: an action that pushes a page would
      // otherwise mount it under an open panel, and the panel would then be
      // showing the previous page's actions over it.
      close()

      const live = getActions().find((action) => action.id === item.id) ?? item
      store.runCommand(live)
    },
    // Belt and braces. Esc is handled once, on the frame root, and the input
    // below lets it bubble — but the default here unwinds the page stack, and
    // that must never be what closing a panel does.
    onEscape: close,
  })

  const indexById = new Map(
    list.entries.map((entry, index) => [entry.item.id, index])
  )

  const sections: ListSection[] = list.groups.map((group, groupIndex) => ({
    key: group.heading ?? `group-${groupIndex}`,
    heading: group.heading,
    headingId: group.heading
      ? `${list.listProps.id}-group-${groupIndex}`
      : undefined,
    rows: group.items.map(({ item, indices }) => {
      const index = indexById.get(item.id) ?? -1

      return {
        item,
        indices,
        isActive: index === list.activeIndex,
        props: list.getItemProps(item, index),
      }
    }),
  }))

  return (
    <div
      id={id}
      ref={panelRef}
      role="dialog"
      aria-label="Actions"
      // Focusable-but-not-tabbable, so a click on the panel's own padding
      // lands here instead of on the frame — whose focus rule would hand the
      // caret straight back to the palette input, out of the panel the user
      // just clicked into.
      tabIndex={-1}
      // One height, whatever the page offers and however far the filter has cut
      // it down — the same argument as the palette's own: nothing reflows under
      // the user mid-keystroke. Deliberately short of the space available, so
      // the panel reads as something resting on the page rather than a second
      // palette over it; the list scrolls when the actions outrun it.
      className="absolute right-0 bottom-full z-10 mb-1.5 flex h-38 w-68 max-w-[calc(100vw-4rem)] flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
    >
      {/* The list scrolls, the search row never does — the same min-h-0 pair
          the frame uses for its page slot. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-(--list-gap) [--list-gap:--spacing(1)]">
        <CommandRows
          sections={sections}
          isEmpty={list.entries.length === 0}
          emptyMessage="No action matches that."
          listProps={{ ...list.listProps, "aria-label": "Actions" }}
        />
      </div>

      {/* At the bottom, against the trigger it came from: the panel opens
          upward, so this is the edge the user's eye is already on. */}
      <div className="flex shrink-0 items-center gap-2 border-t border-border px-3">
        <span className="text-muted-foreground">
          <SearchIcon />
        </span>

        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            // Both belong to the frame: one rule for esc, one focus ring.
            if (event.key === "Escape" || event.key === "Tab") return
            list.onKeyDown(event)
          }}
          placeholder="Search for an action…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded
          aria-controls={list.listProps.id}
          aria-autocomplete="list"
          aria-activedescendant={list.activeOptionId}
          aria-label="Search actions"
          className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  )
}
