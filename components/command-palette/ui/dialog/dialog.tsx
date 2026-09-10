"use client"

import { Activity, useCallback, useEffect, useRef, useState } from "react"
import { Dialog, VisuallyHidden } from "radix-ui"

import type { PageTarget } from "../../core"
import { PaletteRoot, PaletteSurface } from "../palette"
import { IDLE_RESET_MS, useIdleReset } from "./use-idle-reset"
import { useModalShell } from "./use-modal-shell"
import { useToggleHotkey } from "./use-toggle-hotkey"

/** Matches the exit animation below, so hiding waits for the fade to finish. */
const EXIT_MS = 150

/**
 * Open/closed, plus a `visible` flag that lingers on the way out so the close
 * animation can finish before `Activity` hides the palette — `display: none`
 * lands the moment it flips, and would cut the fade off mid-way.
 *
 * Both flags move in the same event handler, never in an effect: an effect
 * that mirrors one piece of state into another just renders twice.
 */
function usePaletteOpenState() {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openRef = useRef(false)

  const clearHide = () => {
    if (hideTimer.current === null) return
    clearTimeout(hideTimer.current)
    hideTimer.current = null
  }

  useEffect(() => clearHide, [])

  const set = useCallback((next: boolean) => {
    // A non-modal dismissable layer reports every outside click, closed or
    // not, so the no-op case has to be cheap.
    if (openRef.current === next) return
    openRef.current = next

    clearHide()
    setOpen(next)

    if (next) setVisible(true)
    else hideTimer.current = setTimeout(() => setVisible(false), EXIT_MS)
  }, [])

  return { open, visible, setOpen: set }
}

/**
 * Runs the idle timer, which needs the store and so has to sit inside the
 * provider — the dialog itself renders the provider and is therefore outside
 * it. Renders nothing.
 */
function IdleReset({ open, after }: { open: boolean; after: number }) {
  useIdleReset(open, after)
  return null
}

/**
 * The palette in a Radix dialog, toggled globally with ⌘K.
 *
 * Nothing here ever unmounts the palette, which is the whole point: `Activity`
 * hides it instead, so every page keeps its state, its scroll and its caret,
 * and reopening lands exactly where the user left off — until it has been
 * closed for `idleResetMs`, at which point the stack goes back to a freshly
 * mounted root. See `useIdleReset`.
 *
 * Four consequences of that:
 *  - the dialog is non-modal and force-mounted, because modal content aria-hides
 *    the rest of the app from a mount-only effect — see `useModalShell`, which
 *    puts modal behavior back for as long as the palette is open;
 *  - `Dialog.Overlay` renders nothing when non-modal, so the overlay below is a
 *    plain div. Clicking it still counts as outside the content, so Radix
 *    dismisses as before;
 *  - `onFocusOutside` is prevented, because a dismissable layer closes as soon
 *    as anything outside it takes focus, and the palette is the only thing
 *    focusable while it is open — so focus landing anywhere else means
 *    something slipped past, not that the user left. Clicking outside still
 *    dismisses. The frame keeps tab from getting out in the first place;
 *  - `onEscapeKeyDown` is prevented, because Radix listens for esc in the
 *    capture phase and would close on the first press. Esc has to clear the
 *    input and unwind the stack first, so the palette decides instead and the
 *    dialog closes through `onDismiss` — esc at the root with an empty input.
 */
export function CommandPaletteDialog({
  rootPage,
  shellSelector,
  idleResetMs = IDLE_RESET_MS,
  children,
}: {
  /** The page the stack starts on. */
  rootPage: PageTarget
  /** Marks what the palette covers while open; defaults to `[data-app-shell]`. */
  shellSelector?: string
  /**
   * How long a closed palette holds its place before starting over at the
   * root. Defaults to 30s; `0` keeps the stack forever.
   */
  idleResetMs?: number
  /** Bridges mounted for as long as the palette lives — see `PaletteRoot`. */
  children?: React.ReactNode
}) {
  const { open, visible, setOpen } = usePaletteOpenState()

  useToggleHotkey(() => setOpen(!open))
  useModalShell(open, { shellSelector })

  return (
    <PaletteRoot rootPage={rootPage} onDismiss={() => setOpen(false)}>
      {children}
      <IdleReset open={open} after={idleResetMs} />

      <Dialog.Root open={open} onOpenChange={setOpen} modal={false}>
        <Dialog.Portal forceMount>
          {/* z-40, not 50: this mounts *after* the content, so equal layers
              would put the dim on top of the palette — and swallow its
              clicks as "outside". */}
          {visible && (
            <div
              aria-hidden
              data-state={open ? "open" : "closed"}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
            />
          )}

          <Dialog.Content
            forceMount
            inert={!open}
            onEscapeKeyDown={(event) => event.preventDefault()}
            onFocusOutside={(event) => event.preventDefault()}
            aria-describedby={undefined}
            className="fixed top-[20vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 data-[state=closed]:pointer-events-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            <VisuallyHidden.Root asChild>
              <Dialog.Title>Command palette</Dialog.Title>
            </VisuallyHidden.Root>

            {/* Hidden, never unmounted — the stack outlives every close. */}
            <Activity mode={visible ? "visible" : "hidden"}>
              <PaletteSurface />
            </Activity>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </PaletteRoot>
  )
}
