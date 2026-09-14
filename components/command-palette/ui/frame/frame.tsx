"use client"

import { ACTIONS_SHORTCUT, formatShortcut } from "../../core"
import { FOOTER_ENTER, ICONS, Icon, Kbd, SearchIcon } from "../primitives"
import { usePlatform } from "../../react"
import { ActionPanel } from "./action-panel"
import { FrameToast, ProgressBar, Spinner } from "./async-status"
import { usePaletteFrame } from "./use-frame"

/**
 * The chrome around every page: the one input row and the footer. All behavior
 * lives in `usePaletteFrame`; this is layout only.
 *
 * Both rows are the frame's alone. A page cannot put anything in the header —
 * the compiler says so, see `NoHeader` — and everything it wants to add goes
 * through the footer instead: hints on the left, actions behind the panel on
 * the right.
 */
export function PaletteFrame({
  children,
  revealId,
}: {
  children: React.ReactNode
  /** Bumped by the host every time it shows the surface — see `PaletteSurface`. */
  revealId?: number
}) {
  const {
    view,
    showInput,
    title,
    rootProps,
    slotProps,
    inputProps,
    hints,
    goBack,
    panel,
    triggerProps,
    busy,
    toast,
    pending,
  } = usePaletteFrame({ revealId })
  const platform = usePlatform()

  return (
    // The height is the whole point of a fixed palette: one height for every
    // page and every filter, so the footer never walks up the screen while the
    // user types and a page with no input is not a shorter palette. It is a
    // variable because the action panel sizes itself against it. The rows above
    // and below hold their natural size; the page slot takes the rest.
    <div
      {...rootProps}
      className="flex h-(--palette-h) w-full flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg outline-none [--palette-h:--spacing(102)]"
    >
      {/* Always rendered, whatever the page's search mode: the way back is not
          a thing a page gets to take away. `relative`, because the progress bar
          is laid over this row's bottom edge rather than given a row of its
          own — one palette height, whatever is happening in it. */}
      <div className="relative flex shrink-0 items-center gap-2.5 border-b border-border px-3.5">
        {view.isRoot ? (
          <span className="text-muted-foreground">
            <SearchIcon />
          </span>
        ) : (
          // The only chrome a nested page gets, and it is the frame's: a way
          // back for the mouse, and only for the mouse. It is out of the tab
          // order because it repeats what esc and backspace already do — both
          // of which the footer spells out — and a tab stop that duplicates a
          // key the page is advertising is a stop with nothing behind it.
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

        {showInput ? (
          <input
            {...inputProps}
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-default disabled:placeholder:text-muted-foreground/60"
          />
        ) : (
          // Same height as the input, so the row is the same row on every page.
          <h2 className="flex h-12 w-full items-center text-sm font-medium">
            {title}
          </h2>
        )}

        {busy && <ProgressBar />}
      </div>

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
        {/* The footer's left half says one thing at a time, in this order:
            that something is running, what the last thing that ran did, or —
            only when neither is true — the keys. */}

        {/* Ahead of all of it: the palette is holding a press and the next
            key is not the user's to spend elsewhere. It says which press, and
            it is gone within `SEQUENCE_MS` whatever happens next. */}
        {pending.length > 0 && (
          <span className={`flex items-center gap-1.5 ${FOOTER_ENTER}`}>
            {pending.map((chord, index) => (
              <span key={index} className="flex items-center gap-1">
                {formatShortcut(chord, platform).map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </span>
            ))}
            waiting for the next key…
          </span>
        )}

        {/* Every run says so here. The loading message draws the spinner as
            part of itself, and one is required of every run — so this is the
            fallback for the one thing that slips past that: a message handed
            over empty. The spinner turns either way. */}
        {!pending.length && busy && toast?.kind !== "loading" && (
          <Spinner className="size-3.5 shrink-0" />
        )}

        {/* Keyed on the toast, so a second outcome animates in as its own
            line rather than sliding its text into the first one's. */}
        {!pending.length && toast && (
          <FrameToast key={toast.id} toast={toast} />
        )}

        {/* The hints stand down for the duration. They are always true and can
            be read at any other moment, and a row that keeps them beside a
            spinner reads as a palette doing two things — the one thing the
            footer is for is saying which of them it is doing.

            Wrapped, so they come back the way the toast arrived: they are
            unmounted while it is up, and mounting is what runs the animation
            again. No key needed for the same reason. */}
        {!pending.length && !busy && !toast && (
          <div className={`flex items-center gap-4 ${FOOTER_ENTER}`}>
            {hints.map((hint) => (
              <span
                key={hint.label + hint.keys.join()}
                className="flex items-center gap-1.5"
              >
                {formatShortcut(hint.keys, platform).map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
                {hint.label}
              </span>
            ))}
          </div>
        )}

        {triggerProps && (
          // The panel is anchored to its trigger rather than to the frame, so
          // opening upward stays structural — there is no offset here to keep
          // in step with the footer's padding.
          <div className="relative ml-auto shrink-0">
            <button
              {...triggerProps}
              className="flex items-center gap-1.5 rounded-sm px-1 py-0.5 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Actions
              {/* Drawn off the chord that fires it, so the two cannot drift
                  — and so it says Ctrl Shift K where that is the chord. */}
              {formatShortcut(ACTIONS_SHORTCUT, platform).map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </button>

            {panel.open && (
              <ActionPanel
                id={panel.id}
                panelRef={panel.ref}
                actions={panel.actions}
                getActions={panel.getActions}
                close={panel.close}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
