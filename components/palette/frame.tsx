"use client"

import { ICONS, Icon, Kbd, SearchIcon } from "./primitives"
import { usePaletteFrame } from "./use-frame"

/**
 * The chrome around every page: the one input and the footer. All behavior
 * lives in `usePaletteFrame`; this is layout only.
 */
export function PaletteFrame({ children }: { children: React.ReactNode }) {
  const { view, showInput, rootProps, inputProps, hints, goBack } =
    usePaletteFrame()

  return (
    <div
      {...rootProps}
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

      {children}

      <div className="flex items-center gap-4 border-t border-border px-3.5 py-2 text-xs text-muted-foreground">
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
