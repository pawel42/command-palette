"use client"

import { ICONS, Icon, Kbd, SearchIcon } from "../primitives"
import { usePaletteFrame } from "./use-frame"

/**
 * The chrome around every page: the one input and the footer. All behavior
 * lives in `usePaletteFrame`; this is layout only.
 */
export function PaletteFrame({ children }: { children: React.ReactNode }) {
  const { view, showInput, rootProps, slotProps, inputProps, hints, goBack } =
    usePaletteFrame()

  return (
    // h-102 is the whole point of a fixed palette: one height for every page
    // and every filter, so the footer never walks up the screen while the user
    // types and a page with no input row is not a shorter palette. The rows
    // above and below hold their natural size; the page slot takes the rest.
    <div
      {...rootProps}
      className="flex h-102 w-full flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg outline-none"
    >
      {showInput && (
        <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-3.5">
          {view.isRoot ? (
            <span className="text-muted-foreground">
              <SearchIcon />
            </span>
          ) : (
            // The only chrome a nested page gets: a way back for the mouse,
            // and only for the mouse. It is out of the tab order because it
            // repeats what esc and backspace already do — both of which the
            // footer spells out — and a tab stop that duplicates a key the
            // page is advertising is a stop with nothing behind it.
            <button
              type="button"
              tabIndex={-1}
              onClick={goBack}
              aria-label="Go back"
              className="-ml-1 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Icon path={ICONS.chevronLeft} className="size-4" />
            </button>
          )}

          <input
            {...inputProps}
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-default disabled:placeholder:text-muted-foreground/60"
          />
        </div>
      )}

      {/* The page gets whatever the input row and footer leave, and a page
          longer than that scrolls inside it — with the keys too, see
          `scrollByKey`. min-h-0, or a tall page would push the footer out
          instead of scrolling. */}
      <div
        {...slotProps}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {children}
      </div>

      <div className="flex shrink-0 items-center gap-4 border-t border-border px-3.5 py-2 text-xs text-muted-foreground">
        {hints.map((hint) => (
          <span
            key={hint.label + hint.keys.join()}
            className="flex items-center gap-1.5"
          >
            {hint.keys.map((key) => (
              <Kbd key={key}>{key}</Kbd>
            ))}
            {hint.label}
          </span>
        ))}

        <span className="ml-auto tabular-nums">
          {view.depth === 1 ? "root" : `depth ${view.depth}`}
        </span>
      </div>
    </div>
  )
}
