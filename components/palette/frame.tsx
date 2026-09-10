"use client"

import { useEffect, useRef } from "react"

import { isEditable } from "@/lib/palette"
import { usePaletteStore, usePaletteView, useSearch } from "@/lib/palette/react"

import { useFrameBridge } from "./bridge"
import { ICONS, Icon, Kbd, SearchIcon } from "./primitives"

/**
 * The chrome around every page: the one input and the footer. It knows nothing
 * about lists — whatever page is on top publishes its key handling through the
 * bridge.
 */
export function PaletteFrame({ children }: { children: React.ReactNode }) {
  const view = usePaletteView()
  const store = usePaletteStore()
  const [query, setQuery] = useSearch()
  const { getKeyHandler, activeOptionId, listId } = useFrameBridge()

  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const editable = isEditable(view.search)
  const showInput = view.search !== "hidden"

  useEffect(() => {
    // Focus follows the page: the input when it can be typed into, otherwise
    // the frame itself — key events are React events, so without focus inside
    // the frame esc would never reach it.
    if (editable) inputRef.current?.focus()
    else rootRef.current?.focus()
  }, [view.instance.instanceId, editable])

  const onRootKeyDown = (event: React.KeyboardEvent) => {
    // The page had first refusal; anything left over is the frame's esc rule.
    if (event.defaultPrevented) return
    if (event.key !== "Escape") return

    event.preventDefault()
    store.escape()
  }

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={onRootKeyDown}
      className="w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg outline-none"
    >
      {showInput && (
        <div className="flex items-center gap-2.5 border-b border-border px-3.5">
          {view.isRoot ? (
            <span className="text-muted-foreground">
              <SearchIcon />
            </span>
          ) : (
            // The only chrome a nested page gets: a way back for the mouse.
            <button
              type="button"
              onClick={() => store.navigation.pop()}
              aria-label="Go back"
              className="-ml-1 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Icon path={ICONS.chevronLeft} className="size-4" />
            </button>
          )}

          <input
            ref={inputRef}
            value={editable ? query : ""}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => getKeyHandler()?.(event)}
            placeholder={
              view.placeholder ??
              (editable ? "Search…" : view.instance.page.title)
            }
            disabled={!editable}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={editable}
            aria-controls={editable ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={editable ? activeOptionId : undefined}
            aria-label={view.placeholder ?? "Search"}
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-default disabled:placeholder:text-muted-foreground/60"
          />
        </div>
      )}

      {children}

      <div className="flex items-center gap-4 border-t border-border px-3.5 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          navigate
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd>
          select
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>esc</Kbd>
          {editable && query ? "clear" : view.isRoot ? "clear" : "back"}
        </span>
        <span className="ml-auto tabular-nums">
          {view.depth === 1 ? "root" : `depth ${view.depth}`}
        </span>
      </div>
    </div>
  )
}
